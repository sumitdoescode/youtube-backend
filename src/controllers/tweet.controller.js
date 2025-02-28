import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/ApiError";
import Tweet from "../models/Tweet";
import User from "../models/User";
import { isValidObjectId } from "mongoose";
import { createTweet } from "../controllers/TweetController";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const user = req.user;
  if (!content?.trim()) {
    throw new ApiError(400, "Content is required for tweet");
  }
  const tweet = await Tweet.create({
    content: content,
    owner: user._id,
  });
  // 201 = status code for successful creation of tweet
  res.status(201).json({ success: true, message: "Tweet created successfully", tweet: tweet });
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const user = req.user;
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        owner: {
          username: 1,
          fullName: 1,
          avatar: { url: 1 },
        },
        likesCount: 1,
        isLiked: 1,
        createdAt: 1,
      },
    },
  ]);
  if (!tweets.length) {
    throw new ApiError(404, "No tweets found for this user");
  }
  const paginatedTweets = await Tweet.aggregatePaginate(tweets, {
    page: Number(page),
    limit: Number(limit),
  });
  res.status(200).json({ success: true, message: "Tweets fetched successfully", tweets: paginatedTweets });
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  const user = req.user;
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
  if (tweet.owner?.toString() !== user._id?.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }
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
  const user = req.user;
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (tweet.owner?.toString() !== user._id?.toString()) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }
  await tweet.remove();
  res.status(200).json({ success: true, message: "Tweet deleted successfully" });
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };

// crud operations
