import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored as a bcrypt hash, never plain text
    plan: { type: String, enum: ["free", "pro"], default: "free" },
    cardLimit: { type: Number, default: 2 }, // free plan = 2 cards, raised when user upgrades
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
