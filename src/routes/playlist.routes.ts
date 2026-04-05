import { Hono } from "hono";
import { requireAuth } from "../middlewares/auth.middleware";
import { createPlaylist, updatePlaylist, deletePlaylist, getPlaylistsByUsername, getPlaylistById, toggleVideoToPlaylist, togglePlaylistVisibility } from "../controllers/playlist.controller";

const router = new Hono();

// prefix => api/playlists

router.post("/", requireAuth, createPlaylist); // POST => /api/playlists
router.get("/users/:username", requireAuth, getPlaylistsByUsername); // GET => /api/playlists/users/:username
router.get("/:playlistId", requireAuth, getPlaylistById); // GET => /api/playlists/:playlistId
router.patch("/:playlistId/videos/:videoId", requireAuth, toggleVideoToPlaylist); // PATCH => /api/playlists/:playlistId/videos/:videoId
router.patch("/:playlistId/visibility", requireAuth, togglePlaylistVisibility); // PATCH => /api/playlists/:playlistId/visibility
router.patch("/:playlistId", requireAuth, updatePlaylist); // PATCH => /api/playlists/:playlistId
router.delete("/:playlistId", requireAuth, deletePlaylist); // DELETE => /api/playlists/:playlistId

export default router;
