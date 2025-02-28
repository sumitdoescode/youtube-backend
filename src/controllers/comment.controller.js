import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import Video from "../models/video.model.js";

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId: " + videoId);
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (!content?.trim()) {
    throw new ApiError(400, "Content is required for comment");
  }
  const comment = await Comment.create({
    content: content.trim(),
    video: video?._id,
    owner: req.user._id,
  });
  res.status(201).json({ success: true, message: "Comment created successfull", comment });
});

const getVideoComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const user = req.user;

  // Validate video ID
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Pagination setup
  let { page = 1, limit = 10 } = req.query;
  page = Math.max(1, Number(page)); // Ensure page is at least 1
  limit = Math.max(1, Number(limit)); // Ensure limit is at least 1

  // Comments aggregation pipeline
  const commentsPipeline = [
    {
      $match: { video: new mongoose.Types.ObjectId(videoId) },
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
        foreignField: "comment",
        as: "likeDetails",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likeDetails" },
        isLiked: {
          $in: [user?._id, "$likeDetails.likedBy"],
        },
      },
    },
    {
      $sort: { createdAt: -1 }, // Sort by creation date (most recent first)
    },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: {
          fullName: 1,
          username: 1,
          avatar: 1,
        },
        likeCount: 1,
        isLiked: 1,
      },
    },
  ];

  // Paginate results using aggregation
  const comments = await Comment.aggregatePaginate(Comment.aggregate(commentsPipeline), { page: page, limit: limit });

  // Handle no comments found
  if (!comments.docs.length) {
    throw new ApiError(404, "No comments found for this video");
  }

  // Respond with paginated comments
  res.status(200).json({
    success: true,
    message: "Comments fetched successfully",
    comments,
  });
});

// the comment should be yours
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const user = req.user;

  // Validate comment ID
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // Validate content
  if (!content?.trim()) {
    throw new ApiError(400, "Content is required for the comment");
  }

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check ownership
  if (comment.owner?.toString() !== user._id?.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  // Update comment content
  comment.content = content.trim();
  await comment.save();

  // Respond with success message
  res.status(200).json({
    success: true,
    message: "Comment updated successfully",
    comment,
  });
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const user = req.user;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner?.toString() !== user._id?.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }
  await comment.remove();
  res.status(200).json({ success: true, message: "Comment deleted successfully" });
});

export { addComment, getVideoComment, updateComment, deleteComment };
