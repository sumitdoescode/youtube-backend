import { Schema, model } from "mongoose";

const watchHistorySchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video",
            required: true,
        },
        watchedBy: {
            type: Schema.Types.ObjectId,
            required: true,
        },
    },
    { timestamps: true },
);

watchHistorySchema.index({ watchedBy: 1 });

export const WatchHistory = model("WatchHistory", watchHistorySchema);
