import express from "express";
import { healthcheck } from "../controllers/healthcheck.controller";

const router = express.Router();

router.get("/", healthcheck);

export default router;
