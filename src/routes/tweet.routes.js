import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../controllers/tweet.controller.js";

const router = express.Router();

router.post("/", auth, createTweet);
router.get("/user/:userId", auth, getUserTweets);
router.patch("/:tweetId", auth, updateTweet);
// we'll check if the user which is sending the request is the owner of the tweet
router.delete("/tweetId", auth, deleteTweet);

export default router;
