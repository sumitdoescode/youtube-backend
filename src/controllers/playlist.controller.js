import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import Video from "../models/video.model.js";
import Playlist from "../models/playlist.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import { validatePlaylistExists, validateVideoExists, validateUserExists } from "../utils/validateExists.js";
import { checkOwnership } from "../utils/checkOwnership.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if (!title?.trim()) {
        throw new ApiError(400, "Playlist title is required");
    }

    const loggedInUser = await getAuthenticatedUser(req);

    const playlist = await Playlist.create({
        title: title.trim(),
        description: description?.trim() ? description.trim() : undefined,
        visibility: "private",
        owner: loggedInUser._id,
    });

    res.status(201).json({ success: true, message: "Playlist created successfully", data: { playlist } });
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { title, description } = req.body;

    const playlist = await validatePlaylistExists(playlistId);

    // either title or description is required
    if (!title?.trim() && !description?.trim()) {
        throw new ApiError(400, "Title Or Descripton is required to update");
    }

    const loggedInUser = await getAuthenticatedUser(req);
    await checkOwnership(playlist, loggedInUser._id);

    if (title?.trim()) {
        playlist.title = title.trim();
    }
    if (description?.trim()) {
        playlist.description = description.trim();
    }
    await playlist.save();

    res.status(200).json({ success: true, message: "Playlist updated successfully", data: { playlist } });
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    const playlist = await validatePlaylistExists(playlistId);

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(playlist, loggedInUser._id);

    await Playlist.findByIdAndDelete(playlist._id);
    res.status(200).json({ success: true, message: "Playlist deleted successfully" });
});

// add or remove video from playlist
const toggleVideoInPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    const playlist = await validatePlaylistExists(playlistId);
    const video = await validateVideoExists(videoId);

    // the video is user trying to add in the playlist is private
    if (video.visibility === "private") throw new ApiError(404, "Video not found/private");

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(playlist, loggedInUser._id);

    const videoIndex = playlist.videos.indexOf(videoId);

    if (videoIndex !== -1) {
        playlist.videos.splice(videoIndex, 1);
        await playlist.save();
        return res.status(200).json({ success: true, message: "Video removed from playlist" });
    }

    playlist.videos.push(videoId);
    await playlist.save();

    res.status(200).json({ success: true, message: "Video added to playlist" });
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    const playlist = await validatePlaylistExists(playlistId);

    const loggedInUser = await getAuthenticatedUser(req);

    if (playlist.visibility !== "public") {
        await checkOwnership(playlist, loggedInUser._id);
    }

    const pipeline = [
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    { $match: { visibility: "public" } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                        },
                    },
                    { $unwind: "$owner" },
                    {
                        $project: {
                            _id: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            visibility: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            owner: {
                                username: 1,
                                avatar: 1,
                            },
                        },
                    },
                ],
            },
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                visibility: 1,
                videos: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ];

    const result = await Playlist.aggregate(pipeline);
    const playlistData = result[0];

    res.status(200).json({ success: true, message: "Playlist successfully fetched with videos", data: { playlist: playlistData } });
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await validateUserExists(userId);

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                visibility: "public",
                // playlist visibility should be public
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            },
        },
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                thumbnail: { $arrayElemAt: ["$videos.thumbnail", 0] },
            },
        },
        {
            $project: {
                title: 1,
                description: 1,
                visibility: 1,
                totalVideos: 1,
                thumbnail: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
        { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({ success: true, message: "User playlists fetched successfully", data: { playlists } });
});

const togglePlaylistVisibility = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    const playlist = await validatePlaylistExists(playlistId);

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(playlist, loggedInUser._id);

    playlist.visibility = playlist.visibility === "public" ? "private" : "public";
    await playlist.save();

    res.status(200).json({ success: true, message: `Playlist visibility toggled to ${playlist.visibility}` });
});

// Export
export { createPlaylist, updatePlaylist, deletePlaylist, toggleVideoInPlaylist, getPlaylistById, getUserPlaylists, togglePlaylistVisibility };
