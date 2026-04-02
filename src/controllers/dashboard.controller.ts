import type { Context } from "hono";
import { Video } from "../models/video.model";
import { Types } from "mongoose";
import { Subscription } from "../models/subscription.model";
import { Like } from "../models/like.model";
import { Comment } from "../models/comment.model";
import { Tweet } from "../models/tweet.model";

export const getChannelStats = async (c: Context) => {
    try {
        const user = c.get("user");
        const [subscribersCount, subscribedToCount, totalVideos, totalTweets, totalComments, videoStats] = await Promise.all([
            Subscription.countDocuments({ channel: user.id }),
            Subscription.countDocuments({ subscriber: user.id }),
            Video.countDocuments({ owner: user.id }),
            Tweet.countDocuments({ owner: user.id }),
            Comment.countDocuments({ owner: user.id }),
            Video.aggregate([
                {
                    $match: {
                        owner: new Types.ObjectId(user.id),
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
                    $addFields: {
                        totalLikes: { $size: "$likes" },
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
                        totalComments: { $size: "$comments" },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: "$viewsCount" },
                        totalLikes: { $sum: "$totalLikes" },
                        totalComments: { $sum: "$totalComments" },
                    },
                },
            ]),
        ]);

        const stats = {
            subscribersCount,
            subscribedToCount,
            totalVideos, // total videos by me
            totalTweets, // total tweets by me
            totalComments, // total comments by me
            videoStats: videoStats[0] || { totalViews: 0, totalLikes: 0, totalComments: 0 },
        };

        return c.json({ success: true, stats }, 200);
    } catch (error) {
        console.error("GET CHANNEL STATS ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

// dashboard controller here we will show all the videos (even if they are private)
export const getChannelVideos = async (c: Context) => {
    const user = c.get("user");
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new Types.ObjectId(user.id),
            },
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
    ]);
    try {
    } catch (error) {
        console.error("GET CHANNEL VIDEOS ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
