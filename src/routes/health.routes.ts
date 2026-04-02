import { Hono } from "hono";
import mongoose from "mongoose";

const router = new Hono();

// GET => /api/health
router.get("/", async (c) => {
    return c.json({ success: true, message: "Server is running", uptime: process.uptime(), service: { db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" } }, 200);
});

export default router;
