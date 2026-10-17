import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import cardRoutes from "./routes/cardRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";

dotenv.config();

const app = express();

// --- Core middleware ---
app.use(express.json({ limit: "2mb" })); // menus with many items can be a few hundred KB
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
  })
);

// Serves uploaded photos/banners/PDFs directly, e.g. http://localhost:5000/uploads/169...-abc.jpg
app.use("/uploads", express.static("uploads"));

// --- Health check (useful for Render's health check path too) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "CardNova API" });
});

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/pages", pageRoutes);        // Menus & QR pages

// --- 404 fallback ---
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// --- Central error handler (always last) ---
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`CardNova API running on http://localhost:${PORT}`);
  });
});
