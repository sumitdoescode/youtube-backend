import express from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { addComment, getVideoComment, updateComment, deleteComment } from "../controllers/comment.controller.js";

const router = express.Router();

// prefix = /api/v1/comments
router.post("/:videoId", auth, addComment); // to add a comment on a video
router.get("/:videoId", auth, getVideoComment); // to get a video comments
router.patch("/:commentId", auth, updateComment); // update a comment
router.delete("/:commentId", auth, deleteComment); // delete a comment

export default router;
