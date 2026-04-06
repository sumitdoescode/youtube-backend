import { rateLimiter } from "hono-rate-limiter";

export const globalRateLimiter = rateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 100, // limit each IP to 100 requests per windowMs
    keyGenerator: (c) => {
        const forwardedFor = c.req.header("x-forwarded-for");
        const realIp = c.req.header("x-real-ip");
        return forwardedFor ?? realIp ?? "unknown";
    },
});
