import mongoose from "mongoose";
import Like from "./like.model.js";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxLength: 1000,
    },
    video: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
    tweet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

commentSchema.pre("remove", async function (next) {
  // delete the likes related to comment
  await Like.deleteMany({ comment: this._id });
  next();
});

commentSchema.plugin(mongooseAggregatePaginate);
// this line will enable us to use pagination in comment conroller

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
