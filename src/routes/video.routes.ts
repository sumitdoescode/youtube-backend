import { Hono } from "hono";
import { getAllVideos, getVideosByUsername, uploadVideo, getVideoById, updateVideo, deleteVideo, toggleVideoVisibility } from "../controllers/video.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = new Hono();

router.get("/", getAllVideos); // GET => /api/videos
router.get("/user/:username", getVideosByUsername); // GET => /api/videos/user/:username
router.post("/", requireAuth, uploadVideo); // POST => /api/videos
router.get("/:id", requireAuth, getVideoById); // GET => /api/videos/:videoId
router.patch("/:id", requireAuth, updateVideo); // PATCH => /api/videos/:videoId
router.delete("/:id", requireAuth, deleteVideo); // DELETE => /api/videos/:videoId
router.patch("/:id/visibility", requireAuth, toggleVideoVisibility); // PATCH => /api/videos/:videoId/toggle-visibility

export default router;
