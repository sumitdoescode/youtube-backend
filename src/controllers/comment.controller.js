import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import Video from "../models/video.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js"; // ✅ Missing in your original code
import getAuthenticatedUser from "../utils/authenticatedUser.js";

// Check ownership helper
const checkOwnership = asyncHandler(async (resource, userId) => {
    if (!resource?.owner) {
        throw new ApiError(500, "Resource does not have an owner field");
    }
    if (resource.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "Access denied. You are not the owner of this");
    }
});

const addComment = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { videoId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (!content?.trim()) throw new ApiError(400, "Content is required");

    const comment = await Comment.create({
        content: content.trim(),
        video: video._id,
        owner: loggedInUser._id,
    });

    res.status(201).json({
        success: true,
        message: "Comment created successfully",
        comment,
    });
});

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const loggedInUser = await getAuthenticatedUser(req);

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, Number(page));
    limit = Math.max(1, Number(limit));

    const pipeline = [
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
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
                foreignField: "comment",
                as: "likeDetails",
            },
        },
        {
            $addFields: {
                likeCount: { $size: "$likeDetails" },
                isLiked: {
                    $in: [loggedInUser._id, "$likeDetails.likedBy"],
                },
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    username: 1,
                    avatar: 1,
                },
                likeCount: 1,
                isLiked: 1,
            },
        },
    ];

    const comments = await Comment.aggregatePaginate(Comment.aggregate(pipeline), { page, limit });

    res.status(200).json({
        success: true,
        message: "Comments fetched successfully",
        comments,
    });
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");
    if (!content?.trim()) throw new ApiError(400, "Content is required");

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(comment, loggedInUser._id);

    comment.content = content.trim();
    await comment.save();

    res.status(200).json({
        success: true,
        message: "Comment updated successfully",
        comment,
    });
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(comment, loggedInUser._id);

    await comment.remove();

    res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
    });
});

export { addComment, getVideoComments, updateComment, deleteComment };
