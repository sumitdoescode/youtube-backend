import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import Video from "../models/video.model.js";
import Playlist from "../models/playlist.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import getAuthenticatedUser from "../utils/authenticatedUser.js";

// Check ownership helper
const checkOwnership = asyncHandler(async (resource, userId) => {
    if (!resource?.owner) {
        throw new ApiError(500, "Resource does not have an owner field");
    }
    if (resource.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "Access denied. You are not the owner of this");
    }
});

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

    res.status(201).json({ success: true, message: "Playlist created successfully", playlist });
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist id");
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

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

    res.status(200).json({ success: true, message: "Playlist updated successfully", playlist });
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist id");

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(playlist, loggedInUser._id);

    await Playlist.findByIdAndDelete(playlist._id);
    res.status(200).json({ success: true, message: "Playlist deleted successfully" });
});

const toggleVideoInPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist or video id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    const loggedInUser = await getAuthenticatedUser(req);
    const video = await Video.findById(videoId);
    if (!video || video.visibility === "private") throw new ApiError(404, "Video not found");

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

    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist id");
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

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
                ],
            },
        },
        { $project: { title: 1, description: 1, visibility: 1, videos: 1 } },
    ];

    const result = await Playlist.aggregate(pipeline);
    const playlistData = result[0];

    res.status(200).json({ success: true, playlist: playlistData });
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID");

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                visibility: "public",
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

    res.status(200).json({ success: true, playlists });
});

const togglePlaylistVisibility = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist id");

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found");

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(playlist, loggedInUser._id);

    playlist.visibility = playlist.visibility === "public" ? "private" : "public";
    await playlist.save();

    res.status(200).json({ success: true, message: `Playlist visibility toggled to ${playlist.visibility}` });
});

// Export
export { createPlaylist, updatePlaylist, deletePlaylist, toggleVideoInPlaylist, getPlaylistById, getUserPlaylists, togglePlaylistVisibility };
