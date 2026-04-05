import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { toggleVideoLike, toggleTweetLike, toggleCommentLike, getLikedVideos, getLikedTweets, getLikedComments } from "../controllers/like.controller";

const router = new Hono();

// prefix => /api/likes
router.post("/videos/:videoId", requireAuth, toggleVideoLike); // POST => /api/likes/videos/:videoId
router.post("/comments/:commentId", requireAuth, toggleCommentLike); // POST => /api/likes/comments/:commentId
router.post("/tweets/:tweetId", requireAuth, toggleTweetLike); // POST => /api/likes/tweets/:tweetId
router.get("/videos", requireAuth, getLikedVideos); // GET => /api/likes/videos
router.get("/tweets", requireAuth, getLikedTweets); // GET => /api/likes/tweets
router.get("/comments", requireAuth, getLikedComments); // GET => /api/likes/comments

export default router;
