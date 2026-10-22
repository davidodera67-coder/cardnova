import mongoose from "mongoose";

// One tap/scan of a card link. Full IP addresses are never stored.
const scanSchema = new mongoose.Schema(
  {
    org: { type: mongoose.Schema.Types.ObjectId, ref: "Org", required: true, index: true },
    card: { type: mongoose.Schema.Types.ObjectId, ref: "OrgCard", required: true, index: true },
    at: { type: Date, default: Date.now },
    cardStatus: { type: String, default: "active" },   // status of the card at that moment
    ipMask: String,
    city: String, region: String, country: String,     // approximate, from the network address
    lat: Number, lng: Number, accuracy: Number,        // exact, ONLY if the person pressed "Share my location"
    gps: { type: Boolean, default: false },
    device: String,
  },
  { timestamps: false }
);
export default mongoose.model("OrgScan", scanSchema);
