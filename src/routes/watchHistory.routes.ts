import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { getWatchHistory, deleteAllWatchHistory, deleteWatchHistory } from "../controllers/watchHistory.controller";

const router = new Hono();

// prefix => api/watch-history

router.get("/", requireAuth, getWatchHistory); // GET => /api/watch-history
router.delete("/all", requireAuth, deleteAllWatchHistory); // DELETE => /api/watch-history/all
router.delete("/:id", requireAuth, deleteWatchHistory); // DELETE => /api/watch-history/:id

// make sure /all is before /:id
export default router;
