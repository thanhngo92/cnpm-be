import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  updateCurrentUser,
  deleteUserById,
} from "../controllers/user.js";
import { verifyToken, isAdmin } from "../middlewares/auth.js";

const router = Router();

router.get("/", verifyToken, isAdmin, getAllUsers);
router.get("/:id", verifyToken, isAdmin, getUserById);
router.patch("/me", verifyToken, updateCurrentUser);   // /me phải trước /:id
router.patch("/:id", verifyToken, isAdmin, updateUserByAdmin);
router.delete("/:id", verifyToken, isAdmin, deleteUserById);

export default router;