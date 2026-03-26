import { Router } from "express";
import {
    getOrdersForAdmin,
    getMyOrders,
    getOrder,
    createOrder,
    updateOrderStatus,
    cancelOrder,
} from "../controllers/order.js";
import { verifyToken, isAdmin } from "../middlewares/auth.js";

const router = Router();

// ADMIN 
router.get("/admin/list", verifyToken, isAdmin, getOrdersForAdmin);
router.patch("/admin/:id/status", verifyToken, isAdmin, updateOrderStatus);

// CUSTOMER
router.get("/my", verifyToken, getMyOrders);
router.get("/:id", verifyToken, getOrder);
router.post("/", verifyToken, createOrder);
router.patch("/:id/cancel", verifyToken, cancelOrder);

export default router;