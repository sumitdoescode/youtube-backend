import express from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos, getLikedTweets, getLikedComments } from "../controllers/like.controller.js";

const router = express.Router();

// prefix = /api/v1/likes
router.post("/toggleVideo/:videoId", auth, toggleVideoLike);
router.post("/toggleComment/:commentId", auth, toggleCommentLike);
router.post("/toggleTweet/:tweetId", auth, toggleTweetLike);
router.get("/videos", auth, getLikedVideos);
router.get("/tweets", auth, getLikedTweets);
router.get("/comments", auth, getLikedComments);

export default router;
