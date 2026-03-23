import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateCurrentUser,
  deleteUserById,
} from "../controllers/user.js";
import { verifyToken } from "../middlewares/auth.js";

const router = Router();

router.get("/", verifyToken, getAllUsers);
router.get("/:id", verifyToken, getUserById);
router.patch("/me", verifyToken, updateCurrentUser);
router.delete("/:id", verifyToken, deleteUserById);

export default router;