import express from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.js";
import {
  getPublicCategories,
  getPublicCategoryDetail,
  getAdminCategories,
  getAdminCategoryDetail,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from "../controllers/category.js";

const router = express.Router();

// ADMIN ROUTES
router.get("/admin/list", verifyToken, isAdmin, getAdminCategories);
router.get("/admin/:id", verifyToken, isAdmin, getAdminCategoryDetail);
router.post("/admin", verifyToken, isAdmin, createCategory);
router.patch("/admin/:id", verifyToken, isAdmin, updateCategory);
router.patch("/admin/:id/status", verifyToken, isAdmin, updateCategoryStatus);
router.delete("/admin/:id", verifyToken, isAdmin, deleteCategory);


// PUBLIC ROUTES
router.get("/", getPublicCategories);
router.get("/:categorySlug", getPublicCategoryDetail);

export default router;