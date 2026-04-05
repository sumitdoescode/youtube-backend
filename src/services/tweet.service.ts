import { Types } from "mongoose";
import { Tweet } from "../models/tweet.model";
import { Like } from "../models/like.model";
import { Comment } from "../models/comment.model";

// delete all comments of tweet => delete likes of the all those comments of tweet => then delete the tweet itself
export const deleteTweetWithCleanup = async (tweetId: string | Types.ObjectId) => {
    try {
        const comments = await Comment.find({ tweet: tweetId }).select("_id");
        const commentIds = comments.map((comment) => comment._id);

        if (commentIds.length) {
            await Like.deleteMany({ comment: { $in: commentIds } });
        }

        await Like.deleteMany({ tweet: tweetId });
        await Comment.deleteMany({ tweet: tweetId });
        await Tweet.deleteOne({ _id: tweetId });
        return true;
    } catch (error) {
        console.error("DELETE TWEET WITH CLEANUP ERROR :", error);
        throw error;
    }
};
