import express from "express";
import { getCurrentUser, setUserAvatar, setUserCoverImage, getChannelDetails } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// prefix=  /api/v1/users
router.get("/me", requireAuth(), getCurrentUser);
router.patch("/me/avatar", requireAuth(), upload.single("avatar"), setUserAvatar);
router.patch("/me/cover-image", requireAuth(), upload.single("coverImage"), setUserCoverImage);
router.get("/channel/:username", requireAuth(), getChannelDetails);

export default router;
