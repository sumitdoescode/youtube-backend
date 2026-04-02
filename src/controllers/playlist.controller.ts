import type { Context } from "hono";
import { Playlist } from "../models/playlist.model";
import { isValidObjectId, Types } from "mongoose";
import { createPlaylistSchema, updatePlaylistSchema } from "../schemas/playlist.schema";
import { flattenError } from "zod";

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
            visibility: "public",
        });
        return c.json({ success: true, playlist }, 201);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getPlaylistById = async (c: Context) => {
    try {
        const user = c.get("user");
        const playlistId = c.req.param("id");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }

        const playlist = await Playlist.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(playlistId),
                    $or: [{ owner: new Types.ObjectId(user.id) }, { visibility: "public" }],
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
        const playlistId = c.req.param("id");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }
        const data = await c.req.json();
        const result = updatePlaylistSchema.safeParse(data);
        if (!result.success) {
            return c.json({ error: flattenError(result.error).fieldErrors }, 400);
        }
        const { name, description } = result.data;

        const playlist = await Playlist.findOneAndUpdate({ _id: playlistId, owner: new Types.ObjectId(user.id) }, { name, description }, { new: true });
        if (!playlist) {
            return c.json({ error: "Playlist not found or not owned by you" }, 404);
        }
        return c.json({ success: true, playlist }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const deletePlaylist = async (c: Context) => {
    try {
        const user = c.get("user");
        const playlistId = c.req.param("id");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }
        const playlist = await Playlist.findOneAndDelete({ _id: playlistId, owner: new Types.ObjectId(user.id) });
        if (!playlist) {
            return c.json({ error: "Playlist not found or not owned by you" }, 404);
        }
        return c.json({ success: true, message: "Playlist deleted successfully" }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const getUserPlaylists = async (c: Context) => {
    try {
        const user = c.get("user");
        const playlists = await Playlist.find({ owner: new Types.ObjectId(user.id) });
        return c.json({ success: true, playlists }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const toggleVideoToPlaylist = async (c: Context) => {
    try {
        const user = c.get("user");
        const playlistId = c.req.param("id");
        const { videoId } = await c.req.json();
        if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
            return c.json({ error: "Invalid playlist ID or video ID" }, 400);
        }
        const playlist = await Playlist.findOneAndUpdate({ _id: playlistId, owner: user._id }, { $push: { videos: videoId } }, { new: true });
        if (!playlist) {
            return c.json({ error: "Playlist not found" }, 404);
        }
        return c.json({ success: true, playlist }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};

export const togglePlaylistVisibility = async (c: Context) => {
    try {
        const user = c.get("user");
        const playlistId = c.req.param("id");
        if (!isValidObjectId(playlistId)) {
            return c.json({ error: "Invalid playlist ID" }, 400);
        }
        const playlist = await Playlist.findOne({ _id: playlistId, owner: user._id });
        if (!playlist) {
            return c.json({ error: "Playlist not found or not owned by you" }, 404);
        }
        playlist.visibility = playlist.visibility === "public" ? "private" : "public";
        await playlist.save();
        return c.json({ success: true, playlist }, 200);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
    }
};
