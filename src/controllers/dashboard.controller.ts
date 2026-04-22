import type { Context } from "hono";
import { Video } from "../models/video.model";
import { Types } from "mongoose";
import { Subscription } from "../models/subscription.model";
import { Comment } from "../models/comment.model";
import { Tweet } from "../models/tweet.model";

export const getChannelStats = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);

        const [subscribersCount, subscribedToCount, totalVideos, totalTweets, videoStats] = await Promise.all([
            Subscription.countDocuments({ channel: userId }),
            Subscription.countDocuments({ subscriber: userId }),
            Video.countDocuments({ owner: userId }),
            Tweet.countDocuments({ owner: userId }),
            Video.aggregate([
                {
                    $match: {
                        owner: userId,
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
            totalVideos,
            totalTweets,
            videoStats: videoStats[0] || { totalViews: 0, totalLikes: 0, totalComments: 0 },
        };

        return c.json({ success: true, stats }, 200);
    } catch (error) {
        throw error;
    }
};

// dashboard controller here we will show all the videos (even if they are private)
export const getChannelVideos = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const { sortBy = "createdAt", sortOrder = "desc" } = c.req.query();
        if (sortBy !== "createdAt" && sortBy !== "viewsCount" && sortBy !== "duration") {
            return c.json({ error: "Invalid sort by it can only be createdAt, viewsCount, duration or title" }, 400);
        }
        if (sortOrder !== "asc" && sortOrder !== "desc") {
            return c.json({ error: "Invalid sort order it can only be asc or desc" }, 400);
        }
        const videos = await Video.aggregate([
            {
                $match: {
                    owner: userId,
                },
            },
            {
                $sort: {
                    [sortBy]: sortOrder === "desc" ? -1 : 1,
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
        return c.json({ success: true, videos }, 200);
    } catch (error) {
        throw error;
    }
};
