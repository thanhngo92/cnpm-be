import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "./app/config/db.js";
import authRoutes from "./app/routes/auth.js";
import userRoutes from "./app/routes/user.js";
import productRoutes from "./app/routes/product.js";
import categoryRoutes from "./app/routes/category.js";
import orderRoutes from "./app/routes/order.js";

const app = express();
const PORT = process.env.PORT || 5000;
await connectDB(process.env.MONGODB_URI);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});