import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const watchHistorySchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    watchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// this will enable us to use pagination
watchHistorySchema.plugin("mongooseAggregatePaginate");

const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);

export default WatchHistory;
