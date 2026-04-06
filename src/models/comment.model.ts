import { Schema, model } from "mongoose";

const commentSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
        },
    },
    { timestamps: true },
);

commentSchema.index({ video: 1, createdAt: -1 });
commentSchema.index({ tweet: 1, createdAt: -1 });
commentSchema.index({ owner: 1 });

export const Comment = model("Comment", commentSchema);
