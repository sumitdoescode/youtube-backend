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

likeSchema.index({ video: 1, likedBy: 1 }, { unique: true, partialFilterExpression: { video: { $exists: true } } });
likeSchema.index({ tweet: 1, likedBy: 1 }, { unique: true, partialFilterExpression: { tweet: { $exists: true } } });
likeSchema.index({ comment: 1, likedBy: 1 }, { unique: true, partialFilterExpression: { comment: { $exists: true } } });

export const Like = model("Like", likeSchema);
