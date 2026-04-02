import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { createPlaylist, updatePlaylist, deletePlaylist, getUserPlaylists, getPlaylistById, addVideoToPlaylist, removeVideoFromPlaylist, updatePlaylistVideo } from "../controllers/playlist.controller";

const router = new Hono();

// prefix => api/playlists

router.post("/", requireAuth, createPlaylist); // POST => /api/playlists
router.get("/:id", requireAuth, getPlaylistById); // GET => /api/playlists/:id
router.patch("/:id", requireAuth, updatePlaylist); // PATCH => /api/playlists/:id
router.delete("/:id", requireAuth, deletePlaylist); // DELETE => /api/playlists/:id
router.get("/user/:username", requireAuth, getUserPlaylists); // GET => /api/playlists/user/:username
router.post("/:id/video", requireAuth, addVideoToPlaylist); // POST => /api/playlists/:id/video
router.delete("/:id/video", requireAuth, removeVideoFromPlaylist); // DELETE => /api/playlists/:id/video
router.patch("/:id/video", requireAuth, updatePlaylistVideo); // PATCH => /api/playlists/:id/video

export default router;
