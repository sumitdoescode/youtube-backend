import type { Context } from "hono";
import { flattenError } from "zod";
import { CreateTweetSchema, UpdateTweetSchema } from "../schemas/tweet.schema";
import { Tweet } from "../models/tweet.model";
import { isValidObjectId, Types } from "mongoose";
import { Like } from "../models/like.model";
import { getDb } from "../lib/db";

export const createTweet = async (c: Context) => {
    try {
        const user = c.get("user");
        const data = await c.req.json();
        const result = CreateTweetSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { content } = result.data;
        const tweet = await Tweet.create({
            content,
            owner: user.id,
        });
        return c.json({ success: true, message: "Tweet created successfully", tweet }, 201);
    } catch (error) {
        console.error("CREATE TWEET ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getTweetsByUsername = async (c: Context) => {
    try {
        const { sortOrder = "desc" } = c.req.query();
        if (sortOrder !== "asc" && sortOrder !== "desc") {
            return c.json({ error: "Invalid sort order it can only be (asc, desc)" }, 400);
        }
        const username = c.req.param("username");
        if (!username) {
            return c.json({ error: "Username is required" }, 400);
        }
        const db = getDb();
        if (!db) {
            return c.json({ error: "Database connection not found" }, 500);
        }
        const user = await db.collection("user").findOne({ username: username.toLowerCase().trim() });
        if (!user) {
            return c.json({ error: `User not found with username : ${username}` }, 404);
        }
        const tweets = await Tweet.aggregate([
            {
                $match: {
                    owner: new Types.ObjectId(user._id),
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
                $sort: {
                    createdAt: sortOrder === "asc" ? 1 : -1,
                },
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
        ]);
        return c.json({ success: true, tweets });
    } catch (error) {
        console.error("GET ALL TWEETS ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getTweetById = async (c: Context) => {
    try {
        const user = c.get("user");
        const tweetId = c.req.param("tweetId");
        if (!isValidObjectId(tweetId)) {
            return c.json({ error: "Invalid tweet ID" }, 400);
        }

        const tweet = await Tweet.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(tweetId),
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
                $project: {
                    _id: 1,
                    content: 1,
                    owner: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        if (!tweet.length) {
            return c.json({ error: "Tweet not found" }, 404);
        }

        const [likesCount, isLiked] = await Promise.all([Like.countDocuments({ tweet: new Types.ObjectId(tweetId) }), Like.findOne({ tweet: new Types.ObjectId(tweetId), likedBy: new Types.ObjectId(user.id) })]);

        tweet[0].likesCount = likesCount;
        tweet[0].isLiked = !!isLiked;

        return c.json({ success: true, tweet: tweet[0] });
    } catch (error) {
        console.error("GET TWEET BY ID ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const updateTweet = async (c: Context) => {
    try {
        const user = c.get("user");
        const tweetId = c.req.param("tweetId");
        if (!isValidObjectId(tweetId)) {
            return c.json({ error: "Invalid tweet ID" }, 400);
        }

        const data = await c.req.json();
        const result = UpdateTweetSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { content } = result.data;
        const tweet = await Tweet.findOneAndUpdate({ _id: tweetId, owner: user.id }, { content }, { new: true });
        if (!tweet) {
            return c.json({ error: "Tweet not found or unauthorized" }, 404);
        }
        return c.json({ success: true, message: "Tweet updated successfully", tweet }, 200);
    } catch (error) {
        console.error("UPDATE TWEET ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const deleteTweet = async (c: Context) => {
    try {
        const user = c.get("user");
        const tweetId = c.req.param("tweetId");
        if (!isValidObjectId(tweetId)) {
            return c.json({ error: "Invalid tweet ID" }, 400);
        }
        const tweet = await Tweet.findOneAndDelete({ _id: tweetId, owner: user.id });
        if (!tweet) {
            return c.json({ error: "Tweet not found or unauthorized" }, 404);
        }
        return c.json({ success: true, message: "Tweet deleted successfully" }, 200);
    } catch (error) {
        console.error("DELETE TWEET ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
