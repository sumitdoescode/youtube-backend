import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { getTweetsByUsername, getTweetById, createTweet, updateTweet, deleteTweet } from "../controllers/tweet.controller";

const router = new Hono();

// prefix => api/tweets
router.post("/", requireAuth, createTweet); // POST => /api/tweets
router.get("/users/:username", getTweetsByUsername); // GET => /api/tweets/users/:username
router.get("/:tweetId", requireAuth, getTweetById); // GET => /api/tweets/:tweetId
router.patch("/:tweetId", requireAuth, updateTweet); // PATCH => /api/tweets/:tweetId
router.delete("/:tweetId", requireAuth, deleteTweet); // DELETE => /api/tweets/:tweetId

export default router;
