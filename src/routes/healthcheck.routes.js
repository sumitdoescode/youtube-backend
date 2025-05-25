import express from "express";
import { healthcheck } from "../controllers/healthcheck.controller.js";

const router = express.Router();

// prefix = /api/v1/healthcheck
router.get("/", healthcheck);

export default router;
