import express from "express";
import { register, login, logout, getMe } from "../controllers/auth.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getMe);
router.post("/logout", logout);

export default router;