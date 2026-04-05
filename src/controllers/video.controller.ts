import { Context } from "hono";
import { UploadVideoSchema, UpdateVideoSchema } from "../schemas/video.schema";
import { Video } from "../models/video.model";
import { flattenError } from "zod";
import mongoose, { isValidObjectId } from "mongoose";
import cloudinary, { uploadFileStream } from "../lib/cloudinary";
import { Types } from "mongoose";
import { Like } from "../models/like.model";
import { Subscription } from "../models/subscription.model";
import { WatchHistory } from "../models/watchHistory.model";
import { Comment } from "../models/comment.model";

export const getAllVideos = async (c: Context) => {
    try {
        const { query, sortBy = "viewsCount", sortOrder = "desc" } = c.req.query();
        if (!query?.trim()) {
            return c.json({ error: "Query is required" }, 400);
        }
        if (sortBy !== "viewsCount" && sortBy !== "duration" && sortBy !== "createdAt") {
            return c.json({ error: "Invalid sort by it can only be (viewsCount, duration, createdAt)" }, 400);
        }
        if (sortOrder !== "asc" && sortOrder !== "desc") {
            return c.json({ error: "Invalid sort order it can only be (asc, desc)" }, 400);
        }
        const videos = await Video.aggregate([
            {
                $match: {
                    title: { $regex: query, $options: "i" },
                    visibility: "public",
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
                    [sortBy]: sortOrder === "asc" ? 1 : -1, // sortBy => viewsCount, duration, createdAt
                },
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    "video.url": 1,
                    "thumbnail.url": 1,
                    duration: 1,
                    viewsCount: 1,
                    owner: 1,
                },
            },
        ]);
        return c.json({ success: true, videos }, 200);
    } catch (error) {
        console.error("Error getting all videos:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getVideosByUsername = async (c: Context) => {
    try {
        const username = c.req.param("username");
        const { sortBy = "viewsCount", sortOrder = "desc" } = c.req.query();
        if (sortBy !== "viewsCount" && sortBy !== "duration" && sortBy !== "createdAt") {
            return c.json({ error: "Invalid sort by it can only be (viewsCount, duration, createdAt)" }, 400);
        }
        if (sortOrder !== "asc" && sortOrder !== "desc") {
            return c.json({ error: "Invalid sort order it can only be (asc, desc)" }, 400);
        }

        // check if the username exists
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Database connection is not initialized");
        }
        const targetUser = await db.collection("user").findOne({ username: username?.toLowerCase().trim() });
        if (!targetUser) {
            return c.json({ error: "User not found with this username" }, 404);
        }
        const videos = await Video.aggregate([
            {
                $match: {
                    owner: new Types.ObjectId(targetUser._id),
                    visibility: "public",
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
                    [sortBy]: sortOrder === "asc" ? 1 : -1,
                },
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    "video.url": 1,
                    "thumbnail.url": 1,
                    duration: 1,
                    viewsCount: 1,
                    owner: 1,
                },
            },
        ]);
        return c.json({ success: true, videos }, 200);
    } catch (error) {
        console.error("Error getting user videos:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const uploadVideo = async (c: Context) => {
    try {
        const user = c.get("user");

        const data = await c.req.formData();
        const video = data.get("video") as File;
        const thumbnail = data.get("thumbnail") as File;
        const title = data.get("title") as string;
        const description = data.get("description") as string;

        const result = UploadVideoSchema.safeParse({ video, thumbnail, title, description });

        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }

        const videoUpload = await uploadFileStream(video, {
            resource_type: "video",
            folder: "videos",
        });

        const thumbnailUpload = await uploadFileStream(thumbnail, {
            resource_type: "image",
            folder: "thumbnails",
        });

        const createdVideo = await Video.create({
            title,
            description,
            video: {
                url: videoUpload.secure_url,
                publicId: videoUpload.public_id,
            },
            thumbnail: {
                url: thumbnailUpload.secure_url,
                publicId: thumbnailUpload.public_id,
            },
            duration: videoUpload.duration,
            owner: user.id,
        });
        return c.json({ success: true, createdVideo }, 201);
    } catch (error) {
        console.error("Error uploading video:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getVideoById = async (c: Context) => {
    try {
        const user = c.get("user");
        const videoId = c.req.param("videoId");

        if (!videoId || !isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }

        const video = await Video.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(videoId),
                    $or: [{ owner: new Types.ObjectId(user.id) }, { visibility: "public" }],
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
                    title: 1,
                    description: 1,
                    "video.url": 1,
                    "thumbnail.url": 1,
                    duration: 1,
                    viewsCount: 1,
                    owner: 1,
                },
            },
        ]);

        if (!video.length) {
            return c.json({ error: "Video not found" }, 404);
        }

        const [likesCount, isLiked, commentsCount, isSubscribed, subscribersCount, updatedVideo] = await Promise.all([
            Like.countDocuments({ video: videoId }),
            Like.exists({ video: videoId, likedBy: user.id }),
            Comment.countDocuments({ video: videoId }),
            Subscription.exists({ channel: video[0].owner._id, subscriber: user.id }),
            Subscription.countDocuments({ channel: video[0].owner._id }),
            Video.findByIdAndUpdate(
                videoId,
                {
                    $inc: {
                        viewsCount: 1,
                    },
                },
                { new: true },
            ),
        ]);

        video[0].likesCount = likesCount;
        video[0].isLiked = Boolean(isLiked);
        video[0].commentsCount = commentsCount;
        video[0].subscribersCount = subscribersCount;
        video[0].isSubscribed = Boolean(isSubscribed);
        video[0].viewsCount = updatedVideo?.viewsCount;

        if (user.watchHistory) {
            await WatchHistory.create({
                video: videoId,
                watchedBy: user.id,
            });
        }

        return c.json({ success: true, video: video[0] }, 200);
    } catch (error) {
        console.error("Error getting video by ID:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const updateVideo = async (c: Context) => {
    try {
        const user = c.get("user");
        const videoId = c.req.param("videoId");

        if (!videoId || !isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }

        const video = await Video.findOne({ _id: videoId, owner: new Types.ObjectId(user.id) });
        if (!video) {
            return c.json({ error: "Video not found or unauthorized" }, 404);
        }

        const data = await c.req.formData();
        const title = data.get("title") as string;
        const description = data.get("description") as string;
        const thumbnail = data.get("thumbnail") as File;

        const result = UpdateVideoSchema.safeParse({ title, description, thumbnail });

        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }

        let oldThumbnailPublicId: string | null = null;

        if (thumbnail) {
            oldThumbnailPublicId = video.thumbnail!.publicId;
            // upload the new thumbnail first on the cloudinary
            const thumbnailUpload = await uploadFileStream(thumbnail, {
                resource_type: "image",
                folder: "thumbnails",
            });

            // update in the database
            video.thumbnail = {
                url: thumbnailUpload.secure_url,
                publicId: thumbnailUpload.public_id,
            };
        }

        video.title = title || video.title;
        video.description = description || video.description;

        // save in the database
        await video.save();

        // delete the old thumbnail from the cloudinary
        if (oldThumbnailPublicId) {
            await cloudinary.uploader.destroy(oldThumbnailPublicId, {
                resource_type: "image",
            });
        }

        return c.json({ success: true, video }, 200);
    } catch (error) {
        console.error("Error updating video:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const deleteVideo = async (c: Context) => {
    try {
        const user = c.get("user");
        const videoId = c.req.param("videoId");

        if (!videoId || !isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }

        const video = await Video.findOne({ _id: videoId, owner: new Types.ObjectId(user.id) });
        if (!video) {
            return c.json({ error: "Video not found or unauthorized" }, 404);
        }

        // first remove the assets from the cloudinary
        await cloudinary.uploader.destroy(video.video!.publicId, {
            resource_type: "video",
        });
        await cloudinary.uploader.destroy(video.thumbnail!.publicId, {
            resource_type: "image",
        });

        // then only remove from the database
        await video.deleteOne();

        return c.json({ success: true, message: "Video deleted successfully" }, 200);
    } catch (error) {
        console.error("Error deleting video:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const toggleVideoVisibility = async (c: Context) => {
    try {
        const user = c.get("user");
        const videoId = c.req.param("videoId");

        if (!videoId || !isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }

        const video = await Video.findOne({ _id: videoId, owner: new Types.ObjectId(user.id) });
        if (!video) {
            return c.json({ error: "Video not found or unauthorized" }, 404);
        }

        video.visibility = video.visibility === "public" ? "private" : "public";
        await video.save();

        return c.json({ success: true, visibility: video.visibility }, 200);
    } catch (error) {
        console.error("Error toggling video visibility:", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
