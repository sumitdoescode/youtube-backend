import express from "express";
import { registerUser, loginUser } from "../controllers/user.controller";
import auth from "../controller/auth.controller";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", auth, loginUser);

export default router;
