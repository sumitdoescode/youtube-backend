import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
      length: [100, "playlist name should not be more than 100 characters"],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxLength: 2000,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

playlistSchema.plugin(mongooseAggregatePaginate);

const Playlist = mongoose.model("Playlist", playlistSchema);

export default Playlist;
