import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import Like from "../models/like.model.js";
import Video from "../models/video.model.js";
import WatchHistory from "../models/watchHistory.model.js";
import mongoose, { isValidObjectId } from "mongoose";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import { parsePagination } from "../utils/parsePagination.js";
import { validateVideoExists } from "../utils/validateExists.js";
import { checkOwnership } from "../utils/checkOwnership.js";

// Get all videos (with optional query, sorting, filtering)
const getAllVideos = asyncHandler(async (req, res) => {
    const { query, sortBy = "views", sortType = "desc", userId } = req.query;
    if (sortBy !== "views" && sortBy !== "duration" && sortBy !== "createdAt") {
        throw new ApiError(400, "Invalid sortBy");
    }
    if (sortType !== "asc" && sortType !== "desc") {
        throw new ApiError(400, "Invalid sortType");
    }

    if (userId && !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const matchStage = {};
    matchStage.visibility = "public"; // Only fetch public videos
    if (query?.trim()) {
        matchStage.title = { $regex: query, $options: "i" };
    }

    if (userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found with provided userId");
        }
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    const sortStage = {};
    if (sortBy === "views" || sortBy === "duration" || sortBy === "createdAt") {
        sortStage[sortBy] = sortType === "asc" ? 1 : -1;
    }

    const aggregate = Video.aggregate([
        {
            $match: matchStage,
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
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnail: {
                    url: "$thumbnail.url",
                },
                video: {
                    url: "$video.url",
                },
                duration: 1,
                views: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    username: "$owner.username",
                    avatar: "$owner.avatar",
                },
            },
        },
        { $sort: sortStage },
    ]);

    const { page, limit } = parsePagination(req.query);

    const result = await Video.aggregatePaginate(aggregate, { page, limit });

    res.status(200).json({
        success: true,
        data: {
            ...result,
        },
    });
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

    const [videoCloudinary, thumbnailCloudinary] = await Promise.all([uploadOnCloudinary(video[0].path), uploadOnCloudinary(thumbnail[0].path)]);

    if (!videoCloudinary) throw new ApiError(400, "Failed to upload video");
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

    res.status(200).json({
        success: true,
        message: "Video uploaded successfully",
        data: {
            video: newVideo,
        },
    });
});

// Get a video by ID
const getVideoById = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { videoId } = req.params;

    // check if video exists
    const video = await validateVideoExists(videoId);

    const videoData = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                $or: [{ visibility: "public" }, { owner: loggedInUser._id }],
                // either video is public or user is the owner
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
                owner: {
                    username: 1,
                    avatar: 1,
                },
            },
        },
    ]);

    if (!videoData.length) throw new ApiError(404, "Video not found");

    // isLiked
    const isLiked = !!(await Like.exists({ video: videoId, likedBy: loggedInUser._id }));

    // Increment the views count
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    // if user watchHistory is enabled, add that in watch history
    if (loggedInUser.watchHistory === "enabled") {
        await WatchHistory.findOneAndUpdate({ video: videoId, watchedBy: loggedInUser._id }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    res.status(200).json({ success: true, message: "Video Successfully Fetched", data: { video: { ...videoData[0], isLiked } } });
});

// Update a video
const updateVideo = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { videoId } = req.params;
    const video = await validateVideoExists(videoId);

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

        await deleteFromCloudinary(video.thumbnail.publicId, "image");

        video.thumbnail.url = thumbnailCloudinary.url;
        video.thumbnail.publicId = thumbnailCloudinary.public_id;
    }
    await video.save();
    const updatedVideo = await Video.findById(videoId).populate("owner", "username avatar.url");
    res.status(200).json({ success: true, message: "Video updated successfully", data: { updatedVideo } });
});

// Delete a video
const deleteVideo = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { videoId } = req.params;
    const video = await validateVideoExists(videoId);

    await checkOwnership(video, loggedInUser._id);

    if (video?.thumbnail?.publicId) {
        const deleteResponse = await deleteFromCloudinary(video.thumbnail.publicId, "image");
        if (!deleteResponse) {
            throw new ApiError(500, "Failed to delete thumbnail from Cloudinary");
        }
    }
    if (video?.video?.publicId) {
        const deleteResponse = await deleteFromCloudinary(video.video.publicId, "video");
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
    const video = await validateVideoExists(videoId);

    await checkOwnership(video, loggedInUser._id);

    video.visibility = video.visibility === "public" ? "private" : "public";
    await video.save();

    res.status(200).json({
        success: true,
        message: `Video is now ${video.visibility}`,
        data: {
            video,
        },
    });
});

export { getAllVideos, uploadVideo, getVideoById, updateVideo, deleteVideo, toggleVideoVisibility };
