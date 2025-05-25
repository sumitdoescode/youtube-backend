import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: [100, "Playlist name should not be more than 100 characters"],
            index: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [2000, "Description should not be more than 2000 characters"],
            // not required
        },
        visibility: {
            type: String,
            enum: ["public", "private"],
            default: "private",
        },
        videos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Enable aggregate pagination
playlistSchema.plugin(mongooseAggregatePaginate);

const Playlist = mongoose.model("Playlist", playlistSchema);

export default Playlist;
