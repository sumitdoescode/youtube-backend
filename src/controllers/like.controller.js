import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import Video from "../models/video.model.js";
import Like from "../models/like.model.js";
import Comment from "../models/comment.model.js";
import Tweet from "../models/tweet.model.js";
import User from "../models/user.model.js";
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import { parsePagination } from "../utils/parsePagination.js";
import { validateVideoExists, validateCommentExists, validateTweetExists } from "../utils/validateExists.js";

// toggle video like
const likeOrUnlikeVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await validateVideoExists(videoId);

    const loggedInUser = await getAuthenticatedUser(req);

    const liked = await Like.findOneAndDelete({ video: videoId, likedBy: loggedInUser._id });

    if (liked) {
        // Like mil gaya toh delete ho gaya, respond karo
        res.status(200).json({ success: true, message: "Removed from Liked Videos" });
    } else {
        // Like nahi mila, ab create karo
        await Like.create({ video: videoId, likedBy: loggedInUser._id });
        res.status(200).json({ success: true, message: "Video Liked Successfully" });
    }
});

// toggle comment Like
const likeOrUnlikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const comment = await validateCommentExists(commentId);
    const loggedInUser = await getAuthenticatedUser(req);
    const liked = await Like.findOneAndDelete({ comment: comment._id, likedBy: loggedInUser._id });
    if (liked) {
        // if liked, delete the like
        res.status(200).json({ success: true, message: "Removed from liked comments" });
    } else {
        await Like.create({ comment: commentId, likedBy: loggedInUser._id });
        res.status(200).json({ success: true, message: "Comment liked successfully" });
    }
});

// toggle tweet like
const likeOrUnlikeTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const tweet = await validateTweetExists(tweetId);
    const loggedInUser = await getAuthenticatedUser(req);
    const liked = await Like.findOneAndDelete({ tweet: tweetId, likedBy: loggedInUser._id });

    if (liked) {
        // if liked, delete the like
        res.status(200).json({ success: true, message: "Removed from liked tweets" });
    } else {
        await Like.create({ tweet: tweetId, likedBy: loggedInUser._id });
        res.status(200).json({ success: true, message: "Tweet liked successfully" });
    }
});

// get liked Videos of LoggedIn User
const getLikedVideos = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const aggregationPipeline = [
        {
            $match: {
                likedBy: loggedInUser._id,
                video: { $exists: true },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $match: {
                            visibility: "public", // updated to match your model
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
                    {
                        $unwind: "$owner",
                    },
                ],
            },
        },
        {
            $unwind: {
                path: "$video",
                preserveNullAndEmptyArrays: false,
            },
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $project: {
                video: {
                    _id: 1,
                    thumbnail: 1,
                    title: 1,
                    duration: 1,
                    createdAt: 1,
                    owner: {
                        username: 1,
                        avatar: 1,
                    },
                },
            },
        },
    ];

    // Pagination params
    const { page, limit } = parsePagination(req.query);

    const likedVideos = await Like.aggregatePaginate(Like.aggregate(aggregationPipeline), { page, limit });

    res.status(200).json({
        success: true,
        message: "Liked Videos Successfully fetched",
        data: { likedVideos },
    });
});

// Get liked tweets of logged-in user
const getLikedTweets = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const likedTweetsAggregation = [
        {
            $match: {
                likedBy: loggedInUser._id,
                tweet: { $exists: true },
            },
        },
        {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweet",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                        },
                    },
                    {
                        $unwind: "$owner",
                    },
                ],
            },
        },
        {
            $unwind: "$tweet",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                tweet: {
                    _id: 1,
                    content: 1,
                    createdAt: 1,
                    owner: {
                        username: 1,
                        avatar: 1,
                    },
                },
            },
        },
    ];

    // Pagination params
    const { page, limit } = parsePagination(req.query);

    const likedTweets = await Like.aggregatePaginate(Like.aggregate(likedTweetsAggregation), {
        page,
        limit,
    });

    res.status(200).json({ success: true, message: "Liked Tweets Successfully fetched", data: { likedTweets } });
});

// Get liked comments of logged-in user
const getLikedComments = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const pipeline = [
        {
            $match: {
                likedBy: loggedInUser._id,
                comment: { $exists: true },
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "comment",
                foreignField: "_id",
                as: "comment",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                        },
                    },
                    {
                        $unwind: "$owner",
                    },
                ],
            },
        },
        {
            $unwind: "$comment",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                comment: {
                    _id: 1,
                    content: 1,
                    createdAt: 1,
                    owner: {
                        username: 1,
                        avatar: 1,
                    },
                },
            },
        },
    ];

    // pagination parameters
    const { page, limit } = parsePagination(req.query);

    const likedComments = await Like.aggregatePaginate(Like.aggregate(pipeline), {
        page,
        limit,
    });

    res.status(200).json({ success: true, message: "Liked Comments Successfully fetched", data: { likedComments } });
});

export { likeOrUnlikeVideo, likeOrUnlikeComment, likeOrUnlikeTweet, getLikedVideos, getLikedTweets, getLikedComments };
