import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { auth } from "./lib/auth";
import userRoutes from "./routes/user.routes";
import videoRoutes from "./routes/video.routes";
import playlistRoutes from "./routes/playlist.routes";
import tweetRoutes from "./routes/tweet.routes";
import commentRoutes from "./routes/comment.routes";
import likeRoutes from "./routes/like.routes";
import watchHistoryRoutes from "./routes/watchHistory.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import healthRoutes from "./routes/health.routes";
import { connectDB } from "./lib/db";
import { setServers } from "node:dns";
import { globalRateLimiter } from "./middlewares/rate-limit-middleware";

const app = new Hono();

// cloudflare and google dns servers
setServers(["1.1.1.1", "8.8.8.8"]);

app.use(logger());

app.use(
    cors({
        origin: "*",
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
    }),
);

app.use(globalRateLimiter);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw)); // better auth
app.route("/api/users", userRoutes);
app.route("/api/videos", videoRoutes);
app.route("/api/playlists", playlistRoutes);
app.route("/api/tweets", tweetRoutes);
app.route("/api/comments", commentRoutes);
app.route("/api/likes", likeRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/watch-history", watchHistoryRoutes);
app.route("/api/subscriptions", subscriptionRoutes);
app.route("/api/health", healthRoutes);

app.notFound((c) => {
    return c.json({ error: "Route not found" }, 404);
});

app.onError((err, c) => {
    console.error(`${err}`);
    return c.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, 500);
});

connectDB();
export default {
    port: process.env.PORT || 8080,
    fetch: app.fetch,
};
