import { Context } from "hono";
import { AddCommentSchema, UpdateCommentSchema } from "../schemas/comment.schema";
import { flattenError } from "zod";
import { isValidObjectId, Types } from "mongoose";
import { Video } from "../models/video.model";
import { Comment } from "../models/comment.model";
import { Tweet } from "../models/tweet.model";
import { deleteCommentWithCleanup } from "../services/comment.service";

export const addCommentOnVideo = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const videoId = c.req.param("videoId");

        if (!isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }

        const data = await c.req.json();
        const result = AddCommentSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { content } = result.data;
        const video = await Video.exists({ _id: videoId });
        if (!video) {
            return c.json({ error: "Video not found" }, 404);
        }

        const comment = await Comment.create({
            owner: userId,
            content,
            video: videoId,
        });
        return c.json({ success: true, message: "Comment added successfully", comment }, 201);
    } catch (error) {
        console.error("ADD COMMENT ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const addCommentOnTweet = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const tweetId = c.req.param("tweetId");

        if (!isValidObjectId(tweetId)) {
            return c.json({ error: "Invalid tweet ID" }, 400);
        }

        const data = await c.req.json();
        const result = AddCommentSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { content } = result.data;
        const tweet = await Tweet.exists({ _id: tweetId });
        if (!tweet) {
            return c.json({ error: "Tweet not found" }, 404);
        }

        const comment = await Comment.create({
            owner: userId,
            content,
            tweet: tweetId,
        });
        return c.json({ success: true, message: "Comment added successfully", comment }, 201);
    } catch (error) {
        console.error("ADD COMMENT ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getVideoComments = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const videoId = c.req.param("videoId");
        if (!isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }
        const { sortBy = "createdAt", sortOrder = "desc" } = c.req.query();
        if (sortBy !== "createdAt" && sortBy !== "likesCount") {
            return c.json({ error: "Invalid sort by it can only be (createdAt, likesCount)" }, 400);
        }
        if (sortOrder !== "asc" && sortOrder !== "desc") {
            return c.json({ error: "Invalid sort order it can only be (asc, desc)" }, 400);
        }
        const video = await Video.exists({ _id: videoId });
        if (!video) {
            return c.json({ error: "Video not found" }, 404);
        }
        const comments = await Comment.aggregate([
            {
                $match: {
                    video: new Types.ObjectId(videoId),
                },
            },
            {
                $lookup: {
                    from: "user",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                username: 1,
                                image: 1,
                            },
                        },
                    ],
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
                    as: "likes",
                },
            },
            {
                $addFields: {
                    likesCount: { $size: "$likes" },
                    isLiked: {
                        $in: [userId, "$likes.likedBy"],
                    },
                },
            },
            {
                $sort: {
                    [sortBy]: sortOrder === "asc" ? 1 : -1,
                },
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    owner: 1,
                    likesCount: 1,
                    isLiked: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        return c.json({ success: true, comments }, 200);
    } catch (error) {
        console.error("GET COMMENTS ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getTweetComments = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const tweetId = c.req.param("tweetId");
        if (!isValidObjectId(tweetId)) {
            return c.json({ error: "Invalid tweet ID" }, 400);
        }
        const { sortBy = "createdAt", sortOrder = "desc" } = c.req.query();
        if (sortBy !== "createdAt" && sortBy !== "likesCount") {
            return c.json({ error: "Invalid sort by it can only be (createdAt, likesCount)" }, 400);
        }
        if (sortOrder !== "asc" && sortOrder !== "desc") {
            return c.json({ error: "Invalid sort order it can only be (asc, desc)" }, 400);
        }
        const tweet = await Tweet.exists({ _id: tweetId });
        if (!tweet) {
            return c.json({ error: "Tweet not found" }, 404);
        }
        const comments = await Comment.aggregate([
            {
                $match: {
                    tweet: new Types.ObjectId(tweetId),
                },
            },
            {
                $lookup: {
                    from: "user",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                username: 1,
                                image: 1,
                            },
                        },
                    ],
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
                    as: "likes",
                },
            },
            {
                $addFields: {
                    likesCount: { $size: "$likes" },
                    isLiked: {
                        $in: [userId, "$likes.likedBy"],
                    },
                },
            },
            {
                $sort: {
                    [sortBy]: sortOrder === "asc" ? 1 : -1,
                },
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    owner: 1,
                    likesCount: 1,
                    isLiked: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        return c.json({ success: true, comments }, 200);
    } catch (error) {
        console.error("GET COMMENTS ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const updateComment = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const commentId = c.req.param("commentId");
        if (!isValidObjectId(commentId)) {
            return c.json({ error: "Invalid comment ID" }, 400);
        }
        const data = await c.req.json();
        const result = UpdateCommentSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { content } = result.data;
        const comment = await Comment.findOneAndUpdate({ _id: commentId, owner: userId }, { content }, { new: true });
        if (!comment) {
            return c.json({ error: "Comment not found or not authorized" }, 404);
        }
        return c.json({ success: true, message: "Comment updated successfully", comment }, 200);
    } catch (error) {
        console.error("UPDATE COMMENT ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const deleteComment = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const commentId = c.req.param("commentId");
        if (!isValidObjectId(commentId)) {
            return c.json({ error: "Invalid comment ID" }, 400);
        }
        const comment = await Comment.findOne({ _id: commentId, owner: userId });
        if (!comment) {
            return c.json({ error: "Comment not found or not authorized" }, 404);
        }

        await deleteCommentWithCleanup(comment._id);

        return c.json({ success: true, message: "Comment deleted successfully" }, 200);
    } catch (error) {
        console.error("DELETE COMMENT ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
