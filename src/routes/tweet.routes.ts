import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { getOwnTweets, getUserTweets, createTweet, updateTweet, deleteTweet } from "../controllers/tweet.controller";

const router = new Hono();

router.get("/", requireAuth, getOwnTweets); // GET => /api/tweets
router.get("/user/:username", requireAuth, getUserTweets); // GET => /api/tweets/users/:username
router.post("/", requireAuth, createTweet); // POST => /api/tweets
router.patch("/:id", requireAuth, updateTweet); // PATCH => /api/tweets/:id
router.delete("/:id", requireAuth, deleteTweet); // DELETE => /api/tweets/:id

export default router;
