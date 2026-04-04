import { Schema, model } from "mongoose";

const tweetSchema = new Schema(
    {
        content: {
            type: String,
            required: true,
            time: true,
            maxLength: 200,
        },
        owner: {
            type: Schema.Types.ObjectId,
            required: true,
        },
    },
    { timestamps: true },
);

tweetSchema.index({ owner: 1, createdAt: -1 });

export const Tweet = model("Tweet", tweetSchema);
