import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { toggleSubscription, getChannelSubscribersAndSubscribedToCount, getChannelSubscribers, getSubscribedChannels } from "../controllers/subscription.controller";

const router = new Hono();

// prefix => api/subscriptions
router.post("/users/:username/toggle", requireAuth, toggleSubscription); // POST => /api/subscriptions/users/:username/toggle
router.get("/users/:username/count", getChannelSubscribersAndSubscribedToCount); // GET => /api/subscriptions/users/:username/count
router.get("/users/:username/subscribers", requireAuth, getChannelSubscribers); // GET => /api/subscriptions/users/:username/subscribers
router.get("/users/:username/subscribed-channels", requireAuth, getSubscribedChannels); // GET => /api/subscriptions/users/:username/subscribed-channels

export default router;
