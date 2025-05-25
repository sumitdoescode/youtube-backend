import express from "express";
import { requireAuth } from "@clerk/express";
import { getChannelStats, getChannelVideos } from "../controllers/dashboard.controller.js";

const router = express.Router();

// prefix = /api/v1/dashboard
router.get("/stats", requireAuth(), getChannelStats); // get channel stats
router.get("/videos", requireAuth(), getChannelVideos); // get channel videos, even if they are private

export default router;
