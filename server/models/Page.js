import mongoose from "mongoose";

// One document per "page" a user publishes from the Menus & QR studio.
// kind "menu"     -> a digital food & drinks menu
// kind "solution" -> any of the other QR types (wifi, links, coupon, event, ...)
// The shape of `data` depends on the type, so it is stored as free-form JSON.
const pageSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["menu", "solution"], required: true },
    type: { type: String, required: true, maxlength: 40 },
    title: { type: String, default: "", maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 60 },
    status: { type: String, enum: ["Published", "Draft"], default: "Published" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    design: { type: mongoose.Schema.Types.Mixed, default: {} },
    views: { type: Number, default: 0 },
    entryCount: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model("Page", pageSchema);
