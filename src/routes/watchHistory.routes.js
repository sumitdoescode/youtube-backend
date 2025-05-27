import express from "express";
import { requireAuth } from "@clerk/express";
import { toggleWatchHistory, getWatchHistory, deleteWatchHistory, deleteAllWatchHistory } from "../controllers/watchHistory.controller.js";

const router = express.Router();

// prefix = /api/v1/watch-history

// Toggle watch history enabled/disabled flag for the user
router.patch("/toggle", requireAuth(), toggleWatchHistory);

// Get all watch history entries of logged-in user
router.get("/", requireAuth(), getWatchHistory);

// Delete all watch history entries of logged-in user
router.delete("/all", requireAuth(), deleteAllWatchHistory);

// Delete a specific watch history entry by ID
router.delete("/:watchHistoryId", requireAuth(), deleteWatchHistory);

export default router;
