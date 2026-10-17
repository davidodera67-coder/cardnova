import mongoose from "mongoose";

// Things visitors send in: feedback, form answers, RSVPs, food orders, leads.
const entrySchema = new mongoose.Schema(
  {
    page: { type: mongoose.Schema.Types.ObjectId, ref: "Page", required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, default: "lead", maxlength: 20 },
    name: { type: String, default: "", maxlength: 120 },
    email: { type: String, default: "", maxlength: 160 },
    phone: { type: String, default: "", maxlength: 40 },
    message: { type: String, default: "", maxlength: 2000 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model("PageEntry", entrySchema);
