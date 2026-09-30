import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["plan_upgrade", "nfc_card"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "KES" },
    provider: { type: String, enum: ["mpesa", "stripe", "paypal", "flutterwave"], required: true },
    status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    reference: String, // provider transaction ID, for reconciliation
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
