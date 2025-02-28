import express from "express";
import auth from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", auth, getWatchHistory);

export default router;
