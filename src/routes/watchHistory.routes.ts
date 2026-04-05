import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { getWatchHistory, toggleWatchHistory, deleteAllWatchHistory, deleteWatchHistory } from "../controllers/watchHistory.controller";

const router = new Hono();

// prefix => api/watch-history

router.get("/", requireAuth, getWatchHistory); // GET => /api/watch-history
router.patch("/", requireAuth, toggleWatchHistory); // PATCH => /api/watch-history
router.delete("/all", requireAuth, deleteAllWatchHistory); // DELETE => /api/watch-history/all
router.delete("/:watchHistoryId", requireAuth, deleteWatchHistory); // DELETE => /api/watch-history/:watchHistoryId

// make sure /all is before /:watchHistoryId
export default router;
