import express from "express";
import { register, login, logout, getCurrentUser, changePassword } from "../controllers/auth.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getCurrentUser);
router.post("/change-password", verifyToken, changePassword);

export default router;