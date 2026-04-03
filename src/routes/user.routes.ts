import { Hono } from "hono";
import { register, login, logout, me, setCoverImage, setImage, toggleWatchHistory, getUserByUsername } from "../controllers/user.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = new Hono();

router.post("/register", register); // POST => /api/users/register
router.post("/login", login); // POST => /api/users/login
router.post("/logout", requireAuth, logout); // POST => /api/users/logout
router.get("/me", requireAuth, me); // GET => /api/users/me
router.post("/cover-image", requireAuth, setCoverImage); // POST => /api/users/cover-image
router.post("/image", requireAuth, setImage); // POST => /api/users/image
router.patch("/watch-history/toggle", requireAuth, toggleWatchHistory); // PATCH => /api/users/watch-history/toggle
router.get("/:username", getUserByUsername); // GET => /api/users/:username

export default router;
