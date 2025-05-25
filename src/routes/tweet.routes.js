import express from "express";
import { requireAuth } from "@clerk/express";
import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../controllers/tweet.controller.js";

const router = express.Router();

// prefix = /api/v1/tweets
router.post("/", requireAuth(), createTweet); // create a tweet
router.get("/user/:userId", requireAuth(), getUserTweets); // get all tweets of a user
router.patch("/:tweetId", requireAuth(), updateTweet); // update a tweet
router.delete("/:tweetId", requireAuth(), deleteTweet); // delete a tweet

export default router;
