import mongoose from "mongoose";
import crypto from "crypto";

const cardSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Step 1 — Info
    name: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    company: { type: String, trim: true },
    bio: { type: String, trim: true },

    // Step 2 — Contact (up to a few of each, so people can list a work + personal line)
    phones: { type: [String], default: [] },
    emails: { type: [String], default: [] },
    website: String,
    address: String,

    // Step 3 — Social links
    socials: {
      linkedin: String,
      instagram: String,
      whatsapp: String,
      facebook: String,
      twitter: String,
    },

    // Step 4 — Media & PDF (store the URL returned by the upload endpoint, not the file itself)
    photoUrl: String,
    bannerUrl: String,
    bannerType: { type: String, enum: ["image", "video", null], default: null },
    pdfUrl: String,

    // Step 5 — Style
    theme: {
      type: String,
      enum: ["light", "dark", "blue", "purple", "gold", "minimal", "corporate", "luxury"],
      default: "light",
    },

    // Step 6 — Buttons shown on the public card
    buttons: [{ type: String, enum: ["save", "call", "whatsapp", "email", "website"] }],

    // Step 7 — Lead capture
    leadCapture: {
      enabled: { type: Boolean, default: false },
      fields: [{ type: String, enum: ["name", "email", "phone", "message"] }],
    },

    // Step 8 — Privacy & publish
    privacy: {
      mode: { type: String, enum: ["public", "private"], default: "public" },
      inviteEmails: [String],
      accessCode: String,
      // A random token that acts as a bearer key for the "private link" sharing option.
      // Generated automatically so every card has one ready, whether or not it's ever used.
      accessLinkToken: { type: String, default: () => crypto.randomBytes(12).toString("hex") },
    },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ["Draft", "Published"], default: "Draft" },

    // Denormalized counters, updated by analytics/lead endpoints rather than recomputed each time
    views: { type: Number, default: 0 },
    leadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Card", cardSchema);
