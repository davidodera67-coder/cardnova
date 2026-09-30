import express from "express";
import protect from "../middleware/auth.js";
import { startMpesaUpgrade, mpesaCallback, getOrderStatus } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/mpesa/stkpush", protect, startMpesaUpgrade);
router.post("/mpesa/callback", mpesaCallback); // public — Safaricom calls this directly
router.get("/mpesa/status/:checkoutRequestID", protect, getOrderStatus);

export default router;
