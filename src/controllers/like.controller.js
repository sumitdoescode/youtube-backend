import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import Video from "../models/video.model.js";
import Like from "../models/like.model.js";
import Comment from "../models/comment.model.js";
import Tweet from "../models/tweet.model.js";
import User from "../models/user.model.js";
import getAuthenticatedUser from "../utils/authenticatedUser.js";

// toggle video like
const likeOrUnlikeVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const loggedInUser = await getAuthenticatedUser(req);

    const liked = await Like.findOne({ video: videoId, likedBy: loggedInUser._id });

    if (liked) {
        await Like.findByIdAndDelete(liked._id);
        res.status(200).json({ success: true, message: "Removed from Liked Videos" });
    } else {
        await Like.create({ video: videoId, likedBy: loggedInUser._id });
        res.status(200).json({ success: true, message: "Video Liked Successfully" });
    }
});

// toggle comment Like
const likeOrUnlikeComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }
    const loggedInUser = await getAuthenticatedUser(req);
    const liked = await Like.findOne({ comment: commentId, likedBy: loggedInUser?._id });
    if (liked) {
        await Like.findByIdAndDelete(liked?._id);
        res.status(200).json({ success: true, message: "Removed from liked comments" });
    } else {
        await Like.create({ comment: commentId, likedBy: loggedInUser?._id });
        res.status(200).json({ success: true, message: "Comment liked successfully" });
    }
});

// toggle tweet like
const likeOrUnlikeTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    const loggedInUser = await getAuthenticatedUser(req);
    const liked = await Like.findOne({ tweet: tweetId, likedBy: loggedInUser?._id });

    if (liked) {
        await Like.findByIdAndDelete(liked?._id);
        res.status(200).json({ success: true, message: "Removed from liked tweets" });
    } else {
        await Like.create({ tweet: tweetId, likedBy: loggedInUser?._id });
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
            $unwind: "$video",
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
    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, parseInt(limit));

    const paginatedLikedVideos = await Like.aggregatePaginate(Like.aggregate(aggregationPipeline), { page: page, limit: limit });

    // Count total liked Videos
    const likedVideosCount = await Like.countDocuments(aggregationPipeline[0].$match);

    res.status(200).json({
        success: true,
        message: "Liked Videos Successfully fetched",
        likedVideosCount,
        likedVideos: paginatedLikedVideos,
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

    // pagination parameters
    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page)); // ensuring page is atleast 1
    limit = Math.max(1, parseInt(limit)); // ensuring limit is atleast 1

    const paginatedLikedTweets = await Like.aggregatePaginate(Like.aggregate(likedTweetsAggregation), {
        page: parseInt(page),
        limit: parseInt(limit),
    });

    // count total number of liked tweets
    const likedTweetsCount = await Like.countDocuments({
        likedBy: loggedInUser._id,
        tweet: { $exists: true },
    });

    res.status(200).json({ success: true, message: "Liked Tweets Successfully fetched", likedTweetsCount, likedTweets: paginatedLikedTweets });
});

// Get liked comments of logged-in user
const getLikedComments = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const likedCommentsAggregation = [
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
    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, Number(page));
    limit = Math.max(1, Number(limit)); // ensuring limit is atleast 1

    const paginatedLikedComments = await Like.aggregatePaginate(Like.aggregate(likedCommentsAggregation), {
        page: Number(page),
        limit: Number(limit),
    });

    // count total number of liked comments
    const totalLikedCommentsCount = await Like.countDocuments({
        likedBy: loggedInUser._id,
        comment: { $exists: true },
    });

    res.status(200).json({ success: true, message: "Liked Comments Successfully fetched", totalLikedCommentsCount, likedComments: paginatedLikedComments });
});

export { likeOrUnlikeVideo, likeOrUnlikeComment, likeOrUnlikeTweet, getLikedVideos, getLikedTweets, getLikedComments };
