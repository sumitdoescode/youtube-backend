import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import Like from "./like.model";

const tweetSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxLength: 280,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

tweetSchema.pre("remove", async function (next) {
  // delete the likes related to tweet
  await Like.deleteMany({ tweet: this._id });
  next();
});

// plugin
tweetSchema.plugin(mongooseAggregatePaginate);

const Tweet = mongoose.model("Tweet", tweetSchema);

export default Tweet;
