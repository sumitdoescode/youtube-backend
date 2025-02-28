import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { getChannelStats, getChannelVideos } from "../controllers/dashboard.controller.js";

const router = express.Router();
router.get("/stats", auth, getChannelStats);
router.get("/videos", auth, getChannelVideos);

export default router;
