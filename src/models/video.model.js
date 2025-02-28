import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import Like from "./like.model.js";
import Comment from "./comment.model.js";
import User from "./user.model.js";

const videoSchema = new mongoose.Schema(
  {
    videoFile: {
      url: { type: String },
      publicId: { type: String },
    },
    thumbnail: {
      url: { type: String },
      publicId: { type: String },
    },
    title: {
      type: String,
      required: true,
      length: [100, "Title should be less than of 100 characters"],
    },
    description: {
      type: String,
      required: true,
      length: [2000, "Description should be less than of 2000 characters"],
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.pre("remove", async function (next) {
  // delete the likes related to video
  await Like.deleteMany({ video: this._id });

  // delete the comments related to video
  await Comment.deleteMany({ video: this._id });
  // also when a comment is going to delete, the likes data related to comments is also going to be deleted as written in comment model file

  // deletes the video from watchHistory

  // deletes the video from playlists
  next();
});

// mongoose let's you add plugin and we will add "mongoose-aggregate-paginate-v2"
videoSchema.plugin(mongooseAggregatePaginate);
// mongooseAggregratePaginate will enable us to implement paginatin in videos

const Video = mongoose.model("Video", videoSchema);

export default Video;
