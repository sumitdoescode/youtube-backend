import { isValidObjectId } from "mongoose";
import User from "../models/user.model.js";
import Video from "../models/video.model.js";
import Playlist from "../models/playlist.model.js";
import Comment from "../models/comment.model.js";
import WatchHistory from "../models/watchHistory.model.js";
import Like from "../models/like.model.js";
import Tweet from "../models/tweet.model.js";
import ApiError from "./ApiError.js";

export const validateUserExists = async (userId) => {
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return user;
};

// same as above one but with different error messages
export const validateChannelExists = async (userId) => {
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid channelId/userId");
    }
    const channel = await User.findById(userId);
    if (!channel) {
        throw new ApiError(404, "Channel not found with userId");
    }
    return channel;
};

export const validateVideoExists = async (videoId) => {
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    return video;
};

export const validatePlaylistExists = async (playlistId) => {
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    return playlist;
};

export const validateCommentExists = async (commentId) => {
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment id");
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }
    return comment;
};

export const validateWatchHistoryExists = async (watchHistoryId) => {
    if (!isValidObjectId(watchHistoryId)) {
        throw new ApiError(400, "Invalid watch history id");
    }
    const watchHistory = await WatchHistory.findById(watchHistoryId);
    if (!watchHistory) {
        throw new ApiError(404, "Watch history not found");
    }
    return watchHistory;
};

export const validateLikeExists = async (likeId) => {
    if (!isValidObjectId(likeId)) {
        throw new ApiError(400, "Invalid like id");
    }
    const like = await Like.findById(likeId);
    if (!like) {
        throw new ApiError(404, "Like not found");
    }
    return like;
};

export const validateTweetExists = async (tweetId) => {
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id");
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    return tweet;
};
