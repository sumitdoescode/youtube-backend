import type { Context } from "hono";
import { isValidObjectId, Types } from "mongoose";
import { WatchHistory } from "../models/watchHistory.model";

export const getWatchHistory = async (c: Context) => {
    try {
        const user = c.get("user");
        const { sortOrder = "desc" } = c.req.query();
        if (sortOrder !== "asc" && sortOrder !== "desc") {
            return c.json({ error: "Invalid sort order it can only be (asc, desc)" }, 400);
        }
        const watchHistory = await WatchHistory.aggregate([
            {
                $match: {
                    watchedBy: new Types.ObjectId(user.id),
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
                                "thumbnail.url": 1,
                                duration: 1,
                                viewsCount: 1,
                                owner: 1,
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
                    _id: 1,
                    video: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        return c.json({ success: true, watchHistory }, 200);
    } catch (error) {
        console.error("GET WATCH HISTORY ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const deleteAllWatchHistory = async (c: Context) => {
    try {
        const user = c.get("user");
        await WatchHistory.deleteMany({ watchedBy: user.id });
        return c.json({ success: true, message: "All Watch history deleted successfully" }, 200);
    } catch (error) {
        console.error("DELETE ALL WATCH HISTORY ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const deleteWatchHistory = async (c: Context) => {
    try {
        const user = c.get("user");
        const watchHistoryId = c.req.param("id");
        if (!isValidObjectId(watchHistoryId)) {
            return c.json({ error: "Invalid watch history ID" }, 400);
        }
        const watchHistory = await WatchHistory.findOneAndDelete({ _id: watchHistoryId, watchedBy: user.id });
        if (!watchHistory) {
            return c.json({ error: "Watch history not found or not authorized" }, 404);
        }
        return c.json({ success: true, message: "Watch history deleted successfully" }, 200);
    } catch (error) {
        console.error("DELETE WATCH HISTORY ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
