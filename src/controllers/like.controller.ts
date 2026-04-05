import { Context } from "hono";
import { isValidObjectId, Types } from "mongoose";
import { Video } from "../models/video.model";
import { Like } from "../models/like.model";
import { Comment } from "../models/comment.model";
import { Tweet } from "../models/tweet.model";

export const toggleVideoLike = async (c: Context) => {
    try {
        const user = c.get("user");
        let videoId: any = c.req.param("videoId");
        if (!isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }
        videoId = new Types.ObjectId(videoId);

        const video = await Video.exists({ _id: videoId });
        if (!video) {
            return c.json({ error: "Video not found" }, 404);
        }

        const deletedLike = await Like.findOneAndDelete({ video: videoId, likedBy: new Types.ObjectId(user.id) });
        if (!deletedLike) {
            await Like.create({ video: videoId, likedBy: new Types.ObjectId(user.id) });
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
        let tweetId: any = c.req.param("tweetId");
        if (!isValidObjectId(tweetId)) {
            return c.json({ error: "Invalid tweet ID" }, 400);
        }
        tweetId = new Types.ObjectId(tweetId);

        const tweet = await Tweet.exists({ _id: tweetId });
        if (!tweet) {
            return c.json({ error: "Tweet not found" }, 404);
        }

        const deletedLike = await Like.findOneAndDelete({ tweet: tweetId, likedBy: new Types.ObjectId(user.id) });
        if (!deletedLike) {
            await Like.create({ tweet: tweetId, likedBy: new Types.ObjectId(user.id) });
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
        let commentId: any = c.req.param("commentId");
        if (!isValidObjectId(commentId)) {
            return c.json({ error: "Invalid comment ID" }, 400);
        }
        commentId = new Types.ObjectId(commentId);

        const comment = await Comment.exists({ _id: commentId });
        if (!comment) {
            return c.json({ error: "Comment not found" }, 404);
        }

        const deletedComment = await Like.findOneAndDelete({ comment: commentId, likedBy: new Types.ObjectId(user.id) });
        if (!deletedComment) {
            await Like.create({ comment: commentId, likedBy: new Types.ObjectId(user.id) });
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
                                visibility: 1,
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
