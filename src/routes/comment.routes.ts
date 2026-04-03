import { Hono } from "hono";
import { addCommentOnVideo, addCommentOnTweet, getVideoComments, getTweetComments, updateComment, deleteComment } from "../controllers/comment.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = new Hono();

// prefix => /api/comments
router.post("/video/:id", requireAuth, addCommentOnVideo); // POST => /api/comments/video/:id
router.post("/tweet/:id", requireAuth, addCommentOnTweet); // POST => /api/comments/tweet/:id
router.get("/video/:id", requireAuth, getVideoComments); // GET => /api/comments/video/:id
router.get("/tweet/:id", requireAuth, getTweetComments); // GET => /api/comments/tweet/:id
router.patch("/:id", requireAuth, updateComment); // PATCH => /api/comments/:id
router.delete("/:id", requireAuth, deleteComment); // DELETE => /api/comments/:id

export default router;
