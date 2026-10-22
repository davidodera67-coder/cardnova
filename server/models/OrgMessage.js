import mongoose from "mongoose";

// One message, saved once and shown to every member it is addressed to.
const messageSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Org", required: true, index: true },
    title: { type: String, trim: true },
    body: { type: String, trim: true },
    audience: { type: String, enum: ["all", "some"], default: "all" },
    to: { type: [String], default: [] },       // member ids when audience is "some"
    author: { type: String, default: "" },     // display name of the admin who wrote it
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model("OrgMessage", messageSchema);
