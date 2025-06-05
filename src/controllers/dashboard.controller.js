import asyncHandler from "../utils/asyncHandler.js";
import Subscription from "../models/subscription.model.js";
import Video from "../models/video.model.js";
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import mongoose from "mongoose";
import { parsePagination } from "../utils/parsePagination.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    // Count total subscribers of the channel (i.e., how many users subscribed to this user's channel) and how many channels this user is subscribed to
    const [totalSubscribersCount, totalSubscribedToCount] = await Promise.all([
        Subscription.countDocuments({
            channel: loggedInUser._id,
        }),
        Subscription.countDocuments({
            subscriber: loggedInUser._id,
        }),
    ]);

    // Combined aggregation for likes, comments, and views
    const videoStatsAgg = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(loggedInUser._id),
            },
        },
        {
            $group: {
                _id: null,
                totalLikes: { $sum: "$likesCount" },
                totalComments: { $sum: "$commentsCount" },
                totalViews: { $sum: "$views" },
            },
        },
    ]);

    const { totalLikes = 0, totalComments = 0, totalViews = 0 } = videoStatsAgg?.[0] || {};

    res.status(200).json({
        success: true,
        message: "Channel stats fetched successfully",
        data: {
            totalSubscribersCount,
            totalSubscribedToCount,
            totalLikes,
            totalComments,
            totalViews,
        },
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
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                thumbnail: 1,
                likesCount: 1,
                commentsCount: 1,
                createdAt: 1,
            },
        },
    ];

    // pagination parameters
    const { page, limit } = parsePagination(req.query);

    const videos = await Video.aggregatePaginate(Video.aggregate(pipeline), { page, limit });
    res.status(200).json({ success: true, message: "Channel Videos Fetched Successfully", data: { videos } });
});

export { getChannelStats, getChannelVideos };
