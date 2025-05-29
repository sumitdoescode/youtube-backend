import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import Like from "./like.model.js";

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
            required: true,
        },
        likesCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Middleware to remove associated likes when a tweet is deleted
tweetSchema.pre("remove", async function (next) {
    // whenever doing anyu database operation wrap in try catch block
    try {
        await Like.deleteMany({ tweet: this._id });
        next();
    } catch (error) {
        next(error); // ✅ Error handling added
    }
});

// Enable aggregate pagination
tweetSchema.plugin(mongooseAggregatePaginate);

const Tweet = mongoose.model("Tweet", tweetSchema);

export default Tweet;
