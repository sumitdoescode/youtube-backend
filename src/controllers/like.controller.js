import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import Video from "../models/video.model.js";
import Like from "../models/like.model.js";
import Comment from "../models/comment.model.js";
import Tweet from "../models/tweet.model.js";

const toggleVideoLIke = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const user = req.user;
  const liked = await Like.findOne({ video: videoId, likedBy: user?._id });
  let likeStatus;
  if (liked) {
    // remove the liked object from the list
    await Like.findByIdAndDelete(liked._id);
    likeStatus = false;
  } else {
    // create a new like object
    await Like.create({ video: videoId, likedBy: user?._id });
    likeStatus = true;
  }
  res.status(200).json({ success: true, message: likeStatus ? "Video Liked Successfully" : "Removed from Liked Videos" });
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  const user = req.user;
  const liked = await Like.findOne({ comment: commentId, likedBy: user?._id });
  let likeStatus;
  if (liked) {
    await Like.findByIdAndDelete(liked?._id);
    likeStatus = false;
  } else {
    await Like.create({ comment: commentId, likedBy: user?._id });
    likeStatus = true;
  }
  res.status(200).json({ success: true, message: "Comment liked successfully" });
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  const user = req.user;
  const liked = await Like.findOne({ tweet: tweetId, likedBy: user?._id });
  let likeStatus;
  if (liked) {
    await Like.findByIdAndDelete(liked?._id);
    likeStatus = false;
  } else {
    await Like.create({ tweet: tweetId, likedBy: user?._id });
    likeStatus = true;
  }
  res.status(200).json({ success: true, message: "Tweet liked successfully" });
});

const getUserLikedVideos = asyncHandler(async (req, res) => {
  const user = req.user;
  const likedVideos = Like.aggregate([
    {
      $match: {
        likedBy: user._id,
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
              "$video.isPublished": true,
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
      $sort: {
        createdAt: -1,
      },
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
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ]);

  //pagination parameters
  let { page = 1, limit = 10 } = req.query;
  page = Math.max(1, parseInt(page)); // ensuring page is atleast 1
  limit = Math.max(1, parseInt(limit)); // ensuring limit is atleast 1

  const paginatedLikedVideos = await Like.aggregatePaginate(likedVideos, {
    page: page,
    limit: limit,
  });

  // count number of liked videos
  const likedVideosCount = await Like.countDocuments({ likedBy: user._id, video: { $exists: true } });

  res.status(200).json({ success: true, message: "Liked Videos Successfully fetched", likedVideosCount, likedVideos: paginatedLikedVideos });
});

const getUserLikedTweets = asyncHandler(async (req, res) => {
  const user = req.user;
  const likedTweetsAggregation = [
    {
      $match: {
        likedBy: user._id,
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
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ];

  // pagination parameters
  let { page = 1, limit = 10 } = req.query;
  page = Math.max(1, parseInt(page));
  limit = Math.max(1, parseInt(limit)); // ensuring limit is atleast 1

  const paginatedLikedTweets = await Like.aggregatePaginate(Like.aggregate(likedTweetsAggregation), {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  // count total number of liked tweets
  const likedTweetsCount = await Like.countDocuments({
    likedBy: user._id,
    tweet: { $exists: true },
  });

  res.status(200).json({ success: true, message: "Liked Tweets Successfully fetched", likedTweetsCount, likedTweets: paginatedLikedTweets });
});

const getUserLikedComments = asyncHandler(async (req, res) => {
  const user = req.user;
  const likedCommentsAggregation = [
    {
      $match: {
        likedBy: user._id,
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
            fullName: 1,
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
  const totalLikedComments = await Like.aggregate([
    {
      $match: {
        likedBy: user._id,
        comment: { $exists: true },
      },
    },
    {
      $count: "totalLikedComments",
    },
  ]);
  const totalLikedCommentsCount = totalLikedComments[0]?.totalLikedComments || 0;

  res.status(200).json({ success: true, message: "Liked Comments Successfully fetched", totalLikedCommentsCount, likedComments: paginatedLikedComments });
});

export { toggleVideoLIke, toggleCommentLike, toggleTweetLike, getUserLikedVideos, getUserLikedTweets, getUserLikedComments };
