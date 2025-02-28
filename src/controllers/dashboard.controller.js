import ApiError from "../utils/ApiError";
import asyncHandler from "../utils/asyncHandler.js";
import Subscription from "../models/subscription.model.js";
import Like from "../models/like.model.js";
import Video from "../models/video.model.js";

const getYourChannelStats = asyncHandler(async (req, res) => {
  const user = req.user;
  const totalSubscribersCount = await Subscription.countDocuments({
    channel: user._id,
  });

  // sum total of all video likes of a channel
  let totalLikes = Video.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(user._id),
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
  ]);

  // sum total of all video views of a channel
  let totalViewsCount = 0;
  const videos = await Video.find({
    owner: user._id,
  }).select("views");
  videos.forEach((video) => {
    totalViewsCount += video.views;
  });

  res.status(200).json({ success: true, message: "Channel Stats fetched Successfully", totalSubscribersCount, totalLikes, totalViewsCount });
});

// dashboard controller here we will show all the videos (even if they are private)
const getYourChannelVideos = asyncHandler(async (req, res) => {
  const user = req.user;
  const videosAggregate = Video.aggregate([
    {
      $match: {
        owner: user._id,
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
  ]);

  // pagination parameters
  let { page = 1, limit = 1 } = req.query;
  page = Math.max(1, parseInt(page));
  limit = Math.max(1, parseInt(limit));

  const videos = await Video.aggregatePaginate(videosAggregate, { page: page, limit: limit });
  res.status(200).json({ success: true, message: "videos generated successfully", videos: videos });
});

export { getYourChannelStats, getYourChannelVideos };
