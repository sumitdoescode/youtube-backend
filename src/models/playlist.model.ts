import { Schema, model } from "mongoose";

const playlistSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        visibility: {
            type: String,
            enum: ["public", "private"],
            default: "private",
        },
        videos: {
            type: [Schema.Types.ObjectId],
            ref: "Video",
        },
    },
    { timestamps: true },
);

playlistSchema.index({ owner: 1, createdAt: -1 });

export const Playlist = model("Playlist", playlistSchema);
