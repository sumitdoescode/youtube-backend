import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import Tweet from "../models/tweet.model.js";
import User from "../models/user.model.js";
import { isValidObjectId } from "mongoose";
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import mongoose from "mongoose";
import { parsePagination } from "../utils/parsePagination.js";
import { validateTweetExists, validateUserExists } from "../utils/validateExists.js";
import { checkOwnership } from "../utils/checkOwnership.js";

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
    res.status(201).json({ success: true, message: "Tweet created successfully", data: { tweet } });
});

const getUserTweets = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { userId } = req.params;
    const user = await validateUserExists(userId);

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

    const { page, limit } = parsePagination(req.query);

    const tweets = await Tweet.aggregatePaginate(Tweet.aggregate(tweetPipeline), { page, limit });

    res.status(200).json({
        success: true,
        message: "Tweets fetched successfully",
        data: {
            tweets,
        },
    });
});

const updateTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { tweetId } = req.params;
    const tweet = await validateTweetExists(tweetId);
    if (!content?.trim()) {
        throw new ApiError(400, "Content is required");
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
    res.status(200).json({
        success: true,
        message: "Tweet updated successfully",
        data: {
            tweet: newTweet,
        },
    });
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const tweet = await validateTweetExists(tweetId);

    const loggedInUser = await getAuthenticatedUser(req);
    await checkOwnership(tweet, loggedInUser._id);

    await Tweet.findByIdAndDelete(tweetId);
    res.status(200).json({ success: true, message: "Tweet deleted successfully" });
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };

// crud operations
