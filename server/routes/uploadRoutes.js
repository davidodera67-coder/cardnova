import express from "express";
import multer from "multer";
import protect from "../middleware/auth.js";
import { uploadFile } from "../controllers/uploadController.js";

// Keep the file in memory just long enough to forward it to Cloudinary —
// nothing is written to Render's disk (which is wiped on every redeploy).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

const router = express.Router();
router.post("/", protect, upload.single("file"), uploadFile);

export default router;
