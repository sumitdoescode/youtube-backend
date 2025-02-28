import express from "express";
import { toggleSubscription, getChannelSubscribers, getSubscribedChannels } from "../controllers/subscription.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/toggleSubscription/:channelId", auth, toggleSubscription);
router.get("/channelSubscribers/:channelId", auth, getChannelSubscribers);
router.get("/subscribedChannels/:channelId", auth, getSubscribedChannels);

export default router;
