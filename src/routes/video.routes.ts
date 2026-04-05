import { Hono } from "hono";
import { getAllVideos, getVideosByUsername, uploadVideo, getVideoById, updateVideo, deleteVideo, toggleVideoVisibility } from "../controllers/video.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = new Hono();

// prefix => api/videos
router.get("/", getAllVideos); // GET => /api/videos
router.get("/users/:username", getVideosByUsername); // GET => /api/videos/users/:username
router.post("/", requireAuth, uploadVideo); // POST => /api/videos
router.get("/:videoId", requireAuth, getVideoById); // GET => /api/videos/:videoId
router.patch("/:videoId", requireAuth, updateVideo); // PATCH => /api/videos/:videoId
router.delete("/:videoId", requireAuth, deleteVideo); // DELETE => /api/videos/:videoId
router.patch("/:videoId/visibility", requireAuth, toggleVideoVisibility); // PATCH => /api/videos/:videoId/visibility

export default router;
