import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const likeSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    tweet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

likeSchema.plugin(mongooseAggregatePaginate);

const Like = mongoose.model("Like", likeSchema);

export default Like;
