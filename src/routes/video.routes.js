import express from "express";
import { auth } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";
import { publishAVideo, getAVideo, updateAVideo, deleteAVideo, toggleVideoStatus } from "../controllers/video.controller.js";

const router = express.Router();

// prefix = /api/v1/videos
router.post(
  "/",
  auth,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);
router.get("/:videoId", auth, getAVideo);
router.patch("/:videoId", auth, upload.single("thumbnail"), updateAVideo);
router.delete("/:videoId", auth, deleteAVideo);
router.patch("/toggleStatus/:videoId", auth, toggleVideoStatus);

export default router;
