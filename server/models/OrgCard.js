import mongoose from "mongoose";

// An NFC/QR card issued by the organisation. There is no limit on how many an organisation can have.
const cardSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Org", required: true, index: true },
    member: { type: String, default: "" },                       // OrgMember id it belongs to (optional)
    label: { type: String, trim: true, default: "" },
    token: { type: String, required: true, unique: true },       // the secret part of the NFC link: /c/<token>
    oldTokens: { type: [String], default: [] },                  // links replaced by "reissue" — they now show a notice
    status: { type: String, enum: ["active", "deactivated"], default: "active" },
    deactivatedAt: Date,
    deactivatedBy: { type: String, default: "" },
    deactivatedReason: { type: String, default: "" },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} }, // what the card shows when tapped
    scans: { type: Number, default: 0 },
    lastScanAt: Date,
  },
  { timestamps: true, minimize: false }
);
export default mongoose.model("OrgCard", cardSchema);
