import express from "express";
import { requireAuth } from "@clerk/express";
import { createPlaylist, getPlaylistById, updatePlaylist, deletePlaylist, toggleVideoInPlaylist, getUserPlaylists, togglePlaylistVisibility } from "../controllers/playlist.controller.js";

const router = express.Router();

// prefix = /api/v1/playlists
router.post("/", requireAuth(), createPlaylist); // create a playlist
router.get("/user/:userId", requireAuth(), getUserPlaylists); // get all playlists of a user (visibility=public)
router.get("/:playlistId", requireAuth(), getPlaylistById); // get a playlist by ID
router.patch("/:playlistId", requireAuth(), updatePlaylist); // update a playlist
router.delete("/:playlistId", requireAuth(), deletePlaylist); // delete a playlist

router.patch("/:playlistId/videos/:videoId", requireAuth(), toggleVideoInPlaylist); // toggle video in playlist
router.patch("/:playlistId/visibility", requireAuth(), togglePlaylistVisibility); // toggle playlist visibility

export default router;
