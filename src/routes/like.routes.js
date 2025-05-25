import express from "express";
import { requireAuth } from "@clerk/express";
import { likeOrUnlikeVideo, likeOrUnlikeComment, likeOrUnlikeTweet, getLikedVideos, getLikedTweets, getLikedComments } from "../controllers/like.controller.js";

// prefix = /api/v1/likes
const router = express.Router();

// toggle video like by videoId
router.patch("/videos/:videoId", requireAuth(), likeOrUnlikeVideo);

// toggle comment like by commentId
router.patch("/comments/:commentId", requireAuth(), likeOrUnlikeComment);

// toggle tweet like by tweetId
router.patch("/tweets/:tweetId", requireAuth(), likeOrUnlikeTweet);

// get liked videos of logged-in user
router.get("/videos", requireAuth(), getLikedVideos);

// get liked tweets of logged-in user
router.get("/tweets", requireAuth(), getLikedTweets);

// get liked comments of logged-in user
router.get("/comments", requireAuth(), getLikedComments);

export default router;
