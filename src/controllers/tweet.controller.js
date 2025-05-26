import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import Tweet from "../models/tweet.model.js";
import User from "../models/user.model.js";
import { isValidObjectId } from "mongoose";
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import mongoose from "mongoose";

// Check ownership helper
const checkOwnership = asyncHandler(async (resource, userId) => {
    if (!resource?.owner) {
        throw new ApiError(500, "Resource does not have an owner field");
    }
    if (resource.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "Access denied. You are not the owner of this");
    }
});

const createTweet = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);
    const { content } = req.body;
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required for tweet");
    }
    const tweet = await Tweet.create({
        content: content,
        owner: loggedInUser._id,
    });
    // 201 = status code for successful creation of tweet
    res.status(201).json({ success: true, message: "Tweet created successfully", tweet: tweet });
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const loggedInUser = await getAuthenticatedUser(req);

    const { userId } = req.params;
    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID provided by client");

    const tweetPipeline = [
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: { $in: [loggedInUser._id, "$likes.likedBy"] },
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                _id: 1,
                content: 1,
                "owner.username": 1,
                "owner.avatar.url": 1,
                likesCount: 1,
                isLiked: 1,
                createdAt: 1,
            },
        },
    ];

    const tweets = await Tweet.aggregatePaginate(Tweet.aggregate(tweetPipeline), { page: Number(page), limit: Number(limit) });

    if (!tweets.docs.length) throw new ApiError(404, "No tweets found for this user");

    res.status(200).json({
        success: true,
        message: "Tweets fetched successfully",
        tweets,
    });
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required");
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(tweet, loggedInUser._id);

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content,
            },
        },
        { new: true }
    );
    res.status(200).json({ success: true, message: "Tweet updated successfully", tweet: newTweet });
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    const loggedInUser = await getAuthenticatedUser(req);
    await checkOwnership(tweet, loggedInUser._id);

    await Tweet.findByIdAndDelete(tweetId);
    res.status(200).json({ success: true, message: "Tweet deleted successfully" });
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };

// crud operations
