import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { toggleVideoLike, toggleTweetLike, toggleCommentLike, getLikedVideos, getLikedTweets, getLikedComments } from "../controllers/like.controller";

const router = new Hono();

router.post("/video/:id", requireAuth, toggleVideoLike); // POST => /api/likes/video/:id
router.post("/comment/:id", requireAuth, toggleCommentLike); // POST => /api/likes/comment/:id
router.post("/tweet/:id", requireAuth, toggleTweetLike); // POST => /api/likes/tweet/:id
router.get("/videos", requireAuth, getLikedVideos); // GET => /api/likes/videos
router.get("/tweets", requireAuth, getLikedTweets); // GET => /api/likes/tweets
router.get("/comments", requireAuth, getLikedComments); // GET => /api/likes/comments

export default router;
