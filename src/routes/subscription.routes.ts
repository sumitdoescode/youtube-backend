import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { toggleSubscription, getChannelSubscribersAndSubscribedToCount, getChannelSubscribers, getSubscribedChannels } from "../controllers/subscription.controller";

const router = new Hono();

// prefix => api/subscriptions
router.post("/user/:username/toggle", requireAuth, toggleSubscription); // POST => /api/subscriptions/user/:username/toggle
router.get("/user/:username/count", getChannelSubscribersAndSubscribedToCount); // GET => /api/subscriptions/user/:username/count
router.get("/user/:username/subscribers", requireAuth, getChannelSubscribers); // GET => /api/subscriptions/user/:username/subscribers
router.get("/user/:username/subscribed-channels", requireAuth, getSubscribedChannels); // GET => /api/subscriptions/user/:username/subscribed-to

export default router;
