import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import Video from "../models/video.model.js";
import WatchHistory from "../models/watchHistory.model.js";
import User from "../models/user.model.js";
import { isValidObjectId } from "mongoose";
import getAuthenticatedUser from "../utils/authenticatedUser.js";

// Check ownership helper
const checkOwnership = asyncHandler(async (resource, userId) => {
    if (!resource?.watchedBy) {
        throw new ApiError(500, "Resource does not have an watchedBy field");
    }
    if (resource.watchedBy.toString() !== userId.toString()) {
        throw new ApiError(403, "Access denied. You are not the owner of this");
    }
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const watchHistoryAggregation = [
        {
            $match: { watchedBy: loggedInUser._id },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
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
        { $unwind: "$video" },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                video: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    thumbnail: 1,
                    duration: 1,
                    views: 1,
                    owner: {
                        _id: 1,
                        username: 1,
                        avatar: 1,
                    },
                },
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ];

    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

    const watchHistory = await WatchHistory.aggregatePaginate(WatchHistory.aggregate(watchHistoryAggregation), { page, limit });

    res.status(200).json({
        success: true,
        message: "Watch history fetched successfully",
        watchHistory,
    });
});

const deleteWatchHistory = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { watchHistoryId } = req.params;
    if (!isValidObjectId(watchHistoryId)) {
        throw new ApiError(400, "Invalid watch history id");
    }
    const watchHistory = await WatchHistory.findById(watchHistoryId);
    if (!watchHistory) {
        throw new ApiError(404, "Watch history not found");
    }

    // Check if user is authorized to delete the watch history
    await checkOwnership(watchHistory, loggedInUser._id);
    await WatchHistory.findByIdAndDelete(watchHistoryId);
    res.status(200).json({ success: true, message: "Watch history deleted successfully" });
});

const deleteAllWatchHistory = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    await WatchHistory.deleteMany({ watchedBy: loggedInUser._id });
    res.status(200).json({ success: true, message: "All watchHistory deleted successfully" });
});

const toggleWatchHistory = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    if (loggedInUser.watchHistory === "enabled") {
        await User.findByIdAndUpdate(
            loggedInUser._id,
            {
                $set: {
                    watchHistory: "disabled",
                },
            },
            { new: true }
        );
        return res.status(200).json({ success: true, message: "Watch History Disabled" });
    }

    if (loggedInUser.watchHistory === "disabled") {
        await User.findByIdAndUpdate(
            loggedInUser._id,
            {
                $set: {
                    watchHistory: "enabled",
                },
            },
            { new: true }
        );
        return res.status(200).json({ success: true, message: "Watch History Enabled" });
    }
});

export { getWatchHistory, deleteWatchHistory, deleteAllWatchHistory, toggleWatchHistory };
