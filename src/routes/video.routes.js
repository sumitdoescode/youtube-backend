import express from "express";
import { requireAuth } from "@clerk/express";
import upload from "../middlewares/multer.middleware.js";
import { uploadVideo, getAllVideos, getVideoById, updateVideo, deleteVideo, toggleVideoVisibility } from "../controllers/video.controller.js";

const router = express.Router();

// prefix = /api/v1/videos
router.get("/", requireAuth(), getAllVideos); // get all videos (with optional query, sorting, filtering)

router.post(
    "/",
    requireAuth(),
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    uploadVideo // upload a video
);
router.get("/:videoId", requireAuth(), getVideoById); // get a video by ID
router.patch("/:videoId", requireAuth(), upload.single("thumbnail"), updateVideo); // update a video
router.delete("/:videoId", requireAuth(), deleteVideo); // delete a video
router.patch("/:videoId/visibility", requireAuth(), toggleVideoVisibility); // toggle video visibility

export default router;
