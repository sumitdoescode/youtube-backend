import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import Subscription from "../models/subscription.model.js";
import Like from "../models/like.model.js";
import Video from "../models/video.model.js";
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import mongoose from "mongoose";

const getChannelStats = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    // Count total subscribers of the channel (i.e., how many users subscribed to this user's channel)
    const totalSubscribersCount = await Subscription.countDocuments({
        channel: loggedInUser._id,
    });

    // Count how many channels this user is subscribed to
    const totalSubscribedToCount = await Subscription.countDocuments({
        subscriber: loggedInUser._id,
    });

    // Sum of likes on this user's videos
    const totalLikesAgg = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(loggedInUser._id) },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $project: {
                likesCount: { $size: "$likes" },
            },
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: "$likesCount" },
            },
        },
    ]);

    const totalLikes = totalLikesAgg?.[0]?.totalLikes || 0;

    // Total comments on this user's videos
    const totalCommentsAgg = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(loggedInUser._id) },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
            },
        },
        {
            $project: {
                commentsCount: { $size: "$comments" },
            },
        },
        {
            $group: {
                _id: null,
                totalComments: { $sum: "$commentsCount" },
            },
        },
    ]);

    const totalCommentsCount = totalCommentsAgg?.[0]?.totalComments || 0;

    // Sum total views of this user's videos
    const videos = await Video.find({ owner: loggedInUser._id }).select("views");
    const totalViewsCount = videos.reduce((sum, video) => sum + (video.views || 0), 0);

    res.status(200).json({
        success: true,
        message: "Channel stats fetched successfully",
        totalSubscribersCount,
        totalSubscribedToCount,
        totalLikes,
        totalCommentsCount,
        totalViewsCount,
    });
});

// dashboard controller here we will show all the videos (even if they are private)
const getChannelVideos = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(loggedInUser._id),
            },
        },
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
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                commentsCount: {
                    $size: "$comments",
                },
            },
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                thumbnail: 1,
                createdAt: 1,
                likesCount: 1,
                commentsCount: 1,
            },
        },
    ];

    // pagination parameters
    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

    const paginatedVideos = await Video.aggregatePaginate(Video.aggregate(pipeline), { page: page, limit: limit });
    res.status(200).json({ success: true, message: "videos generated successfully", videos: paginatedVideos });
});

export { getChannelStats, getChannelVideos };
