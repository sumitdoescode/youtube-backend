import { Types } from "mongoose";
import { Comment } from "../models/comment.model";
import { Like } from "../models/like.model";

export const deleteCommentWithCleanup = async (commentId: string | Types.ObjectId) => {
    try {
        await Like.deleteMany({ comment: commentId });
        await Comment.deleteOne({ _id: commentId });
        return true;
    } catch (error) {
        throw error;
    }
};
