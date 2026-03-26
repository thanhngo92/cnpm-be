import express from "express";
import { verifyToken, isAdmin } from "../middlewares/auth.js";
import {
  getPublicProducts,
  getPublicProductDetail,
  getAdminProducts,
  getAdminProductDetail,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} from "../controllers/product.js";

const router = express.Router();


// ADMIN ROUTES
router.get("/admin/list", verifyToken, isAdmin, getAdminProducts);
router.get("/admin/:id", verifyToken, isAdmin, getAdminProductDetail);
router.post("/admin", verifyToken, isAdmin, createProduct);
router.patch("/admin/:id", verifyToken, isAdmin, updateProduct);
router.patch("/admin/:id/status", verifyToken, isAdmin, updateProductStatus);
router.delete("/admin/:id", verifyToken, isAdmin, deleteProduct);

// PUBLIC ROUTES
router.get("/", getPublicProducts);
router.get("/:productSlug", getPublicProductDetail);

export default router;