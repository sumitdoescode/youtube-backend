import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import Like from "../models/like.model.js";
import Playlist from "../models/playlist.model.js";
import Video from "../models/video.model.js";
import WatchHistory from "../models/watchHistory.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import getAuthenticatedUser from "../utils/authenticatedUser.js";

// Check if the user is the owner of the resource
const checkOwnership = asyncHandler(async (resource, userId) => {
    if (!resource?.owner) {
        throw new ApiError(500, "Resource does not have an owner field");
    }
    if (resource.owner.toString() !== userId.toString()) {
        throw new ApiError(500, "Access denied. You are not the owner of this");
    }
});

// Get all videos (with optional query, sorting, filtering)
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "views", sortType = "desc", userId } = req.query;
    if (sortBy !== "views" && sortBy !== "duration" && sortBy !== "createdAt") {
        throw new ApiError(400, "Invalid sortBy");
    }
    if (sortType !== "asc" && sortType !== "desc") {
        throw new ApiError(400, "Invalid sortType");
    }

    if (userId && !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const matchStage = {};
    if (query?.trim()) {
        matchStage.title = { $regex: query, $options: "i" };
    }
    if (userId) {
        matchStage.owner = userId;
    }

    const sortStage = {};
    if (sortBy === "views") {
        sortStage[sortBy] = sortType === "asc" ? 1 : -1;
    }
    if (sortBy === "duration") {
        sortStage[sortBy] = sortType === "asc" ? 1 : -1;
    }
    if (sortBy === "createdAt") {
        sortStage[sortBy] = sortType === "asc" ? 1 : -1;
    }

    const aggregate = Video.aggregate([
        { $match: matchStage },
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
                title: 1,
                description: 1,
                thumbnail: {
                    url: 1,
                },
                video: {
                    url: 1,
                },
                duration: 1,
                views: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    username: 1,
                    avatar: 1,
                },
            },
        },
        { $sort: sortStage },
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
    };

    const result = await Video.aggregatePaginate(aggregate, options);

    res.status(200).json({ success: true, ...result });
});

// Upload a new video
const uploadVideo = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { title, description } = req.body;
    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required");
    }

    const { video, thumbnail } = req.files;
    if (!video || !thumbnail) {
        if (thumbnail) fs.unlinkSync(thumbnail[0].path);
        if (video) fs.unlinkSync(video[0].path);
        throw new ApiError(400, "Both video and thumbnail are required");
    }

    const videoCloudinary = await uploadOnCloudinary(video[0].path);
    if (!videoCloudinary) throw new ApiError(400, "Failed to upload video");

    const thumbnailCloudinary = await uploadOnCloudinary(thumbnail[0].path);
    if (!thumbnailCloudinary) throw new ApiError(400, "Failed to upload thumbnail");

    const newVideo = await Video.create({
        video: {
            url: videoCloudinary.url,
            publicId: videoCloudinary.public_id,
        },
        thumbnail: {
            url: thumbnailCloudinary.url,
            publicId: thumbnailCloudinary.public_id,
        },
        title,
        description,
        duration: videoCloudinary.duration || 0,
        views: 0,
        owner: loggedInUser._id,
    });

    res.status(200).json({ success: true, message: "Video uploaded successfully", video: newVideo });
});

// Get a video by ID
const getVideoById = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id");

    const videoData = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId), visibility: "public" } },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
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
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: { $in: [loggedInUser._id, "$likes.likedBy"] },
            },
        },
        {
            $project: {
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                video: 1,
                thumbnail: 1,
                createdAt: 1,
                updatedAt: 1,
                likesCount: 1,
                isLiked: 1,
                owner: {
                    username: 1,
                    avatar: 1,
                },
            },
        },
        { $limit: 1 },
    ]);

    if (!videoData.length) throw new ApiError(404, "Video not found");

    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    await WatchHistory.findOneAndUpdate({ video: videoId, watchedBy: loggedInUser._id }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });

    res.status(200).json({ success: true, message: "Video Successfully Fetched", video: videoData[0] });
});

// Update a video
const updateVideo = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoId");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    await checkOwnership(video, loggedInUser._id);

    const { title, description } = req.body;
    let thumbnail = req.file;
    if (!title?.trim() && !description?.trim() && !thumbnail) {
        throw new ApiError(400, "At least one field (title, description, thumbnail) must be provided for update");
    }
    if (title?.trim()) {
        video.title = title.trim();
    }
    if (description?.trim()) {
        video.description = description.trim();
    }

    if (thumbnail) {
        const thumbnailCloudinary = await uploadOnCloudinary(thumbnail.path);
        if (!thumbnailCloudinary) throw new ApiError(500, "Couldn't upload thumbnail");

        await deleteFromCloudinary(video.thumbnail.publicId);

        video.thumbnail.url = thumbnailCloudinary.url;
        video.thumbnail.publicId = thumbnailCloudinary.public_id;
    }
    await video.save();

    res.status(200).json({ success: true, message: "Video updated successfully", video });
});

// Delete a video
const deleteVideo = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    await checkOwnership(video, loggedInUser._id);

    if (video?.thumbnail?.publicId) {
        const deleteResponse = await deleteFromCloudinary(video.thumbnail.publicId);
        if (!deleteResponse) {
            throw new ApiError(500, "Failed to delete thumbnail from Cloudinary");
    }
    if (video?.video?.publicId) {
        const deleteResponse = await deleteFromCloudinary(video.video.publicId);
        if (!deleteResponse) {
            throw new ApiError(500, "Failed to delete video from Cloudinary");
        }
    }

    await video.deleteOne();

    res.status(200).json({ success: true, message: "Video deleted successfully" });
});

// Toggle video visibility between public/private
const toggleVideoVisibility = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    await checkOwnership(video, loggedInUser._id);

    video.visibility = video.visibility === "public" ? "private" : "public";
    await video.save();

    res.status(200).json({
        success: true,
        message: `Video is now ${video.visibility}`,
        video,
    });
});

export { getAllVideos, uploadVideo, getVideoById, updateVideo, deleteVideo, toggleVideoVisibility };
