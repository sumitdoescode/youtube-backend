import { Schema, model } from "mongoose";

const videoSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        video: {
            url: {
                type: String,
                required: true,
            },
            publicId: {
                type: String,
                required: true,
            },
        },
        thumbnail: {
            url: {
                type: String,
                required: true,
            },
            publicId: {
                type: String,
                required: true,
            },
        },
        visibility: {
            type: String,
            enum: ["public", "private"],
            default: "private",
        },
        duration: {
            type: Number,
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        viewsCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
);

videoSchema.index({ owner: 1 });
videoSchema.index({ owner: 1, visibility: 1 });
videoSchema.index({ visibility: 1, viewsCount: -1 });
videoSchema.index({ visibility: 1, duration: -1 });
videoSchema.index({ visibility: 1, createdAt: -1 });
export const Video = model("Video", videoSchema);
