import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { getChannelStats, getChannelVideos } from "../controllers/dashboard.controller";

const router = new Hono();

// prefix => api/dashboard

router.get("/stats", requireAuth, getChannelStats); // GET => /api/dashboard/stats
router.get("/videos", requireAuth, getChannelVideos); // GET => /api/dashboard/videos

export default router;
