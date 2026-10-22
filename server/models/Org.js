import mongoose from "mongoose";

// One organisation (party, church, club, company …) with its own member portal at /o/<slug>.
const orgSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // the CardNova account that created it
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    joinCode: { type: String, required: true },
    settings: {
      requireApproval: { type: Boolean, default: true },
      cardLocationPrompt: { type: Boolean, default: false }, // ask people who tap an ACTIVE card to share their location
    },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} }, // the page content (logo, links, contact, text boxes …)
    design: { type: mongoose.Schema.Types.Mixed, default: {} },  // chosen template + colours
  },
  { timestamps: true, minimize: false }
);
export default mongoose.model("Org", orgSchema);
