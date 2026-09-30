import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import protect from "../middleware/auth.js";
import { uploadFile } from "../controllers/uploadController.js";

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${unique}${path.extname(file.originalname)}`);
  },
});

// Generous overall cap — precise per-type limits are enforced in the controller
// after upload, since Multer doesn't know which wizard slot this is for yet.
const upload = multer({ storage, limits: { fileSize: 30 * 1024 * 1024 } });

const router = express.Router();

router.post("/", protect, upload.single("file"), uploadFile);

export default router;
