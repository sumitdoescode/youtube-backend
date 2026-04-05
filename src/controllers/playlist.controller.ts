import type { Context } from "hono";
import { isValidObjectId, Types } from "mongoose";
import { createPlaylistSchema, updatePlaylistSchema } from "../schemas/playlist.schema";
import { flattenError } from "zod";
import { getDb } from "../lib/db";
import { Playlist } from "../models/playlist.model";
import { Video } from "../models/video.model";

export const createPlaylist = async (c: Context) => {
    try {
        const user = c.get("user");
        const data = await c.req.json();
        const result = createPlaylistSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error) }, 400);
        }
        const { name, description } = result.data;
        const playlist = await Playlist.create({
            owner: new Types.ObjectId(user.id),
            name,
            description,
        });
        return c.json({ success: true, playlist }, 201);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getPlaylistById = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const playlistId = c.req.param("playlistId");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }
        const playlistObjectId = new Types.ObjectId(playlistId);

        const playlist = await Playlist.aggregate([
            {
                $match: {
                    _id: playlistObjectId,
                    $or: [{ owner: userId }, { visibility: "public" }],
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
                    pipeline: [
                        {
                            $match: {
                                $or: [{ owner: userId }, { visibility: "public" }],
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
                                title: 1,
                                description: 1,
                                thumbnail: 1,
                                duration: 1,
                                owner: 1,
                                viewsCount: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
                        },
                        {
                            $sort: {
                                createdAt: -1,
                            },
                        },
                    ],
                },
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    visibility: 1,
                    videos: 1,
                    owner: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);

        if (!playlist.length) {
            return c.json({ error: "Playlist not found or you are not authorized to view it" }, 404);
        }

        return c.json({ success: true, playlist: playlist[0] }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const updatePlaylist = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const playlistId = c.req.param("playlistId");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }
        const data = await c.req.json();
        const result = updatePlaylistSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { name, description } = result.data;

        const playlist = await Playlist.findOneAndUpdate({ _id: playlistId, owner: userId }, { name, description }, { new: true });
        if (!playlist) {
            return c.json({ error: "Playlist not found or you are not authorized to update it" }, 404);
        }
        return c.json({ success: true, playlist }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const deletePlaylist = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const playlistId = c.req.param("playlistId");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }
        const playlist = await Playlist.findOneAndDelete({ _id: playlistId, owner: userId });
        if (!playlist) {
            return c.json({ error: "Playlist not found or you are not authorized to delete it" }, 404);
        }
        return c.json({ success: true, message: "Playlist deleted successfully" }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getPlaylistsByUsername = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const username = c.req.param("username");
        if (!username) {
            return c.json({ error: "Username is required" }, 400);
        }
        const db = getDb();
        if (!db) {
            return c.json({ error: "Database connection not found" }, 500);
        }
        const targetUser = await db.collection("user").findOne({ username: username?.toLowerCase().trim() });
        if (!targetUser) {
            return c.json({ error: "User not found" }, 404);
        }

        const { sortOrder = "desc" } = c.req.query();
        if (sortOrder !== "asc" && sortOrder !== "desc") {
            return c.json({ error: "Invalid sort order. Use 'asc' or 'desc'" }, 400);
        }

        const playlists = await Playlist.aggregate([
            {
                $match: {
                    owner: new Types.ObjectId(targetUser._id),
                    $or: [{ visibility: "public" }, { owner: userId }],
                },
            },
            {
                $addFields: {
                    videosCount: { $size: "$videos" },
                    firstVideo: {
                        $first: "$videos",
                    },
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "firstVideo",
                    foreignField: "_id",
                    as: "firstVideo",
                    pipeline: [
                        {
                            $project: {
                                "thumbnail.url": 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$firstVideo",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $sort: {
                    createdAt: sortOrder === "asc" ? 1 : -1,
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    visibility: 1,
                    videosCount: 1,
                    firstVideo: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);
        return c.json({ success: true, playlists }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const toggleVideoToPlaylist = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const playlistId = c.req.param("playlistId");
        const videoId = c.req.param("videoId");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }
        if (!isValidObjectId(videoId)) {
            return c.json({ error: "Invalid video ID" }, 400);
        }
        const playlistObjectId = new Types.ObjectId(playlistId);
        const videoObjectId = new Types.ObjectId(videoId);
        const video = await Video.findById(videoId);
        if (!video) {
            return c.json({ error: "Video not found" }, 404);
        }

        const playlist = await Playlist.findOne({ _id: playlistId, owner: userId });
        if (!playlist) {
            return c.json({ error: "Playlist not found or you are not authorized to add/remove video from it" }, 404);
        }
        // remove if already present, otherwise add it
        if (playlist.videos.some((id) => id.toString() === videoObjectId.toString())) {
            const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, { $pull: { videos: videoObjectId } }, { new: true });
            return c.json({ success: true, message: "Video removed from playlist successfully", updatedPlaylist }, 200);
        }

        const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, { $push: { videos: videoObjectId } }, { new: true });
        return c.json({ success: true, message: "Video added to playlist successfully", updatedPlaylist }, 200);
    } catch (error) {
        console.error("TOGGLE VIDEO TO PLAYLIST ERROR : ", error);
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const togglePlaylistVisibility = async (c: Context) => {
    try {
        const user = c.get("user");
        const userId = new Types.ObjectId(user.id);
        const playlistId = c.req.param("playlistId");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }
        const playlist = await Playlist.findOne({ _id: playlistId, owner: userId }).select("_id visibility");
        if (!playlist) {
            return c.json({ error: "Playlist not found or you are not authorized to update it" }, 404);
        }
        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlist._id,
            {
                $set: {
                    visibility: playlist.visibility === "public" ? "private" : "public",
                },
            },
            { new: true },
        );
        return c.json({ success: true, playlist: updatedPlaylist }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
