import { Schema, model } from "mongoose";

const likeSchema = new Schema(
    {
        likedBy: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        },
    },
    { timestamps: true },
);

export const Like = model("Like", likeSchema);
