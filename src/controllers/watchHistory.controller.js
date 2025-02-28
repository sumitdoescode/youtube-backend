import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/ApiError";
import Video from "../models/video.model";
import WatchHistory from "../models/watchHistory.model";
import { isValidObjectId } from "mongoose";

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = req.user;

  const watchHistoryAggregation = [
    {
      $match: {
        watchedBy: user?._id,
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
              isPublished: true,
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
          title: 1,
          description: 1,
          thumbnail: 1,
          duration: 1,
          views: 1,
          owner: {
            _id: 1,
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ];

  const { page = 1, limit = 10 } = req.query;
  page = Math.max(1, parseInt(page)); // ensuring minimum value of page is 1
  limit = Math.max(1, parseInt(limit)); // ensuring minimum value of limit is 1

  const watchHistory = await WatchHistory.aggregatePaginate(WatchHistory.aggregate(watchHistoryAggregation), {
    page: Number(page),
    limit: Number(limit),
  });
  if (!watchHistory.docs.length) {
    throw new ApiError(404, "No watch history found");
  }
  res.status(200).json({ success: true, message: "Watch history fetched successfully", watchHistory });
});

const deleteWatchHistory = asyncHandler(async (req, res) => {
  const user = req.user;
  const { watchHistoryId } = req.params;
  if (!isValidObjectId(watchHistoryId)) {
    throw new ApiError(400, "Invalid watch history id");
  }
  const watchHistory = await WatchHistory.findById(watchHistoryId);
  if (!watchHistory) {
    throw new ApiError(404, "Watch history not found");
  }

  // Check if user is authorized to delete the watch history
  if (watchHistory.watchedBy.toString() !== user._id.toString()) {
    throw new ApiError(403, "Access denied. You cannot delete this watch history");
  }
  await WatchHistory.findByIdAndDelete(watchHistoryId);
  res.status(200).json({ success: true, message: "Watch history deleted successfully" });
});

const deleteAllWatchHistory = asyncHandler(async (req, res) => {
  const user = req.user;
  await WatchHistory.deleteMany({ watchedBy: user._id });
  res.status(204).json({ success: true, message: "All watchHistory deleted successfully" });
});

export { getWatchHistory, deleteWatchHistory, deleteAllWatchHistory };
