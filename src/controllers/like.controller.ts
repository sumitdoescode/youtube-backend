import { Context } from "hono";
import { isValidObjectId, Types } from "mongoose";
import { Video } from "../models/video.model";
import { Like } from "../models/like.model";
import { Comment } from "../models/comment.model";
import { Tweet } from "../models/tweet.model";

export const toggleVideoLike = async (c: Context) => {
    try {
        const user = c.get("user");
        const videoId = c.req.param("videoId");
        if (!isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }

        const video = await Video.exists({ _id: videoId });
        if (!video) {
            return c.json({ error: "Video not found" }, 404);
        }

        const deletedLike = await Like.findOneAndDelete({ video: videoId, likedBy: user._id });
        if (!deletedLike) {
            await Like.create({ video: videoId, likedBy: user._id });
            return c.json({ success: true, message: "Video liked successfully" }, 200);
        }
        return c.json({ success: true, message: "Video unliked successfully" }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const toggleTweetLike = async (c: Context) => {
    try {
        const user = c.get("user");
        const tweetId = c.req.param("tweetId");
        if (!isValidObjectId(tweetId)) {
            return c.json({ error: "Invalid tweet ID" }, 400);
        }

        const tweet = await Tweet.exists({ _id: tweetId });
        if (!tweet) {
            return c.json({ error: "Tweet not found" }, 404);
        }

        const deletedLike = await Like.findOneAndDelete({ tweet: tweetId, likedBy: user.id });
        if (!deletedLike) {
            await Like.create({ tweet: tweetId, likedBy: user.id });
            return c.json({ success: true, message: "Tweet liked successfully" }, 200);
        }

        return c.json({ success: true, message: "Tweet unliked successfully" }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const toggleCommentLike = async (c: Context) => {
    try {
        const user = c.get("user");
        const commentId = c.req.param("commentId");
        if (!isValidObjectId(commentId)) {
            return c.json({ error: "Invalid comment ID" }, 400);
        }

        const comment = await Comment.exists({ _id: commentId });
        if (!comment) {
            return c.json({ error: "Comment not found" }, 404);
        }

        const deletedComment = await Like.findOneAndDelete({ comment: commentId, likedBy: user._id });
        if (!deletedComment) {
            await Like.create({ comment: commentId, likedBy: user._id });
            return c.json({ success: true, message: "Comment liked successfully" }, 200);
        }
        return c.json({ success: true, message: "Comment unliked successfully" }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getLikedVideos = async (c: Context) => {
    try {
        const user = c.get("user");

        const likedVideos = await Like.aggregate([
            {
                $match: {
                    likedBy: new Types.ObjectId(user.id),
                    video: {
                        $exists: true,
                    },
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
                            $project: {
                                _id: 1,
                                title: 1,
                                description: 1,
                                thumbnail: 1,
                                duration: 1,
                                viewsCount: 1,
                                isPublished: 1,
                                owner: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
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
                    _id: 0,
                    video: 1,
                },
            },
        ]);

        return c.json({ success: true, likedVideos }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getLikedTweets = async (c: Context) => {
    try {
        const user = c.get("user");

        const likedTweets = await Like.aggregate([
            {
                $match: {
                    likedBy: new Types.ObjectId(user.id),
                    tweet: {
                        $exists: true,
                    },
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
                            $project: {
                                _id: 1,
                                content: 1,
                                owner: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
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
                    _id: 0,
                    tweet: 1,
                },
            },
        ]);

        return c.json({ success: true, likedTweets }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getLikedComments = async (c: Context) => {
    try {
        const user = c.get("user");

        const likedComments = await Like.aggregate([
            {
                $match: {
                    likedBy: new Types.ObjectId(user.id),
                    comment: {
                        $exists: true,
                    },
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
                            $project: {
                                _id: 1,
                                content: 1,
                                owner: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
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
                    _id: 0,
                    comment: 1,
                },
            },
        ]);

        return c.json({ success: true, likedComments }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
