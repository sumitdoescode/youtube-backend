import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import Like from "./like.model.js";
import Comment from "./comment.model.js";
import Playlist from "./playlist.model.js";
import WatchHistory from "./watchHistory.model.js";

const videoSchema = new mongoose.Schema(
    {
        video: {
            url: { type: String, required: true },
            publicId: { type: String },
        },
        thumbnail: {
            url: { type: String, required: true },
            publicId: { type: String },
        },
        title: {
            type: String,
            required: true,
            maxlength: [100, "Title should be less than of 100 characters"],
        },
        description: {
            type: String,
            required: true,
            maxlength: [2000, "Description should be less than of 2000 characters"],
        },
        duration: {
            type: Number,
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        visibility: {
            type: String,
            enum: ["public", "private"],
            default: "public",
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Video.find({owner: user._id}).sort({views: -1})
videoSchema.index({ owner: 1 });
videoSchema.index({ views: -1 });

videoSchema.pre("remove", async function (next) {
    const videoId = this._id;

    try {
        // Delete all likes associated with the video
        await Like.deleteMany({ video: videoId });

        // Delete all comments associated with the video
        await Comment.deleteMany({ video: videoId });
        // Comment model should already delete comment likes via its own middleware

        // Delete all watch history entries for the video
        await WatchHistory.deleteMany({ video: videoId });

        // Remove video from all playlists
        await Playlist.updateMany({ videos: videoId }, { $pull: { videos: videoId } });

        next();
    } catch (err) {
        next(err);
    }
});

// mongoose let's you add plugin and we will add "mongoose-aggregate-paginate-v2"
videoSchema.plugin(mongooseAggregatePaginate);
// mongooseAggregratePaginate will enable us to implement paginatin in videos

const Video = mongoose.model("Video", videoSchema);

export default Video;
