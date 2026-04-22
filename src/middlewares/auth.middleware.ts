import { auth } from "../lib/auth";
import type { Context, Next } from "hono";

export const requireAuth = async (c: Context, next: Next) => {
    try {
        const session = await auth.api.getSession({
            headers: c.req.raw.headers,
        });
        if (!session) {
            return c.json({ error: "Unauthorized" }, 401);
        }
        c.set("user", session.user);
        await next();
    } catch (error) {
        throw error;
    }
};
