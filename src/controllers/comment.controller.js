import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import Video from "../models/video.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js"; // ✅ Missing in your original code
import getAuthenticatedUser from "../utils/authenticatedUser.js";
import { parsePagination } from "../utils/parsePagination.js";
import { validateCommentExists, validateVideoExists } from "../utils/validateExists.js";
import { checkOwnership } from "../utils/checkOwnership.js";

const addComment = asyncHandler(async (req, res) => {
    const loggedInUser = await getAuthenticatedUser(req);

    const { videoId } = req.params;
    const { content } = req.body;

    const video = await validateVideoExists(videoId);

    if (!content?.trim()) throw new ApiError(400, "Content is required");

    const comment = await Comment.create({
        content: content.trim(),
        video: video._id,
        owner: loggedInUser._id,
    });

    res.status(201).json({
        success: true,
        message: "Comment created successfully",
        data: { comment },
    });
});

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await validateVideoExists(videoId);

    const loggedInUser = await getAuthenticatedUser(req);

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

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

    const { page, limit } = parsePagination(req.query);

    const comments = await Comment.aggregatePaginate(Comment.aggregate(pipeline), { page, limit });

    res.status(200).json({
        success: true,
        message: "Video Comments fetched successfully",
        data: { comments },
    });
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await validateCommentExists(commentId);
    if (!content?.trim()) throw new ApiError(400, "Content is required");

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(comment, loggedInUser._id);

    comment.content = content.trim();
    await comment.save();

    res.status(200).json({
        success: true,
        message: "Comment updated successfully",
        data: { comment },
    });
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await validateCommentExists(commentId);

    const loggedInUser = await getAuthenticatedUser(req);

    await checkOwnership(comment, loggedInUser._id);

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
    });
});

export { addComment, getVideoComments, updateComment, deleteComment };
