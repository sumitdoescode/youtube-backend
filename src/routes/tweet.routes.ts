import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { getTweetsByUsername, getTweetById, createTweet, updateTweet, deleteTweet } from "../controllers/tweet.controller";

const router = new Hono();

// prefix => api/tweets
router.get("/user/:username", getTweetsByUsername); // GET => /api/tweets/users/:username
router.get("/:id", requireAuth, getTweetById); // GET => /api/tweets/:id
router.post("/", requireAuth, createTweet); // POST => /api/tweets
router.patch("/:id", requireAuth, updateTweet); // PATCH => /api/tweets/:id
router.delete("/:id", requireAuth, deleteTweet); // DELETE => /api/tweets/:id

export default router;
