import express from "express";
import multer from "multer";
import protect from "../middleware/auth.js";
import * as C from "../controllers/orgController.js";
import { uploadFile } from "../controllers/uploadController.js";
import { orgTable } from "./orgTable.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
// Organiser uploads (logo, card photos…): signed in to the portal with level 2+, no CardNova account needed.
router.post("/:slug/admin/upload", C.adminUploadGuard, upload.single("file"), uploadFile);
for (const [method, path, guard, handler] of orgTable(C)) {
  const args = guard === "owner" ? [protect, handler] : [handler];
  router[method.toLowerCase()](path, ...args);
}
export default router;
