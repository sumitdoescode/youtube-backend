import { Hono } from "hono";
import { addCommentOnVideo, addCommentOnTweet, getVideoComments, getTweetComments, updateComment, deleteComment } from "../controllers/comment.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = new Hono();

// prefix => /api/comments
router.post("/videos/:videoId", requireAuth, addCommentOnVideo); // POST => /api/comments/videos/:videoId
router.post("/tweets/:tweetId", requireAuth, addCommentOnTweet); // POST => /api/comments/tweets/:tweetId
router.get("/videos/:videoId", requireAuth, getVideoComments); // GET => /api/comments/videos/:videoId
router.get("/tweets/:tweetId", requireAuth, getTweetComments); // GET => /api/comments/tweets/:tweetId
router.patch("/:commentId", requireAuth, updateComment); // PATCH => /api/comments/:commentId
router.delete("/:commentId", requireAuth, deleteComment); // DELETE => /api/comments/:commentId

export default router;
