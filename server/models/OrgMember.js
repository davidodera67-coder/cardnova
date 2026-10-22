import mongoose from "mongoose";

// A person who signs in to an organisation portal. level: 0 member, 1 messenger, 2 manager, 3 owner.
const memberSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Org", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    codeHash: { type: String, default: "" },
    mustChange: { type: Boolean, default: false },       // true after an admin issues a temporary code
    level: { type: Number, default: 0, min: 0, max: 3 },
    status: { type: String, enum: ["pending", "active", "suspended", "rejected"], default: "pending" },
    emailVerified: { type: Boolean, default: false },
    verifyTokenHash: String,
    verifyExpires: Date,
    resetTokenHash: String,
    resetExpires: Date,
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: Date,
    consentAt: Date,
  },
  { timestamps: true }
);
memberSchema.index({ org: 1, email: 1 }, { unique: true });
export default mongoose.model("OrgMember", memberSchema);
