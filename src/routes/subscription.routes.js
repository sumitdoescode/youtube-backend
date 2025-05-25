import express from "express";
import { toggleSubscription, getChannelSubscribersAndSubscribedToCount, getChannelSubscribers, getSubscribedChannels } from "../controllers/subscription.controller.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

// prefix = /api/v1/subscriptions
router.post("/:userId/toggle", requireAuth(), toggleSubscription);
router.get("/:userId/count", requireAuth(), getChannelSubscribersAndSubscribedToCount);
router.get("/:userId/subscribers", requireAuth(), getChannelSubscribers); // get list of channel subscribers
router.get("/:userId/subscribed-channels", requireAuth(), getSubscribedChannels); // get list of subscribed channels

export default router;
