import express from "express";
import { requireAuth } from "@clerk/express";
import { addComment, getVideoComments, updateComment, deleteComment } from "../controllers/comment.controller.js";

const router = express.Router();

// prefix = /api/v1/comments
router.post("/video/:videoId", requireAuth(), addComment); // to add a comment on a video
router.get("/video/:videoId", requireAuth(), getVideoComments); // to get a video comments
router.patch("/:commentId", requireAuth(), updateComment); // update a comment
router.delete("/:commentId", requireAuth(), deleteComment); // delete a comment

export default router;
