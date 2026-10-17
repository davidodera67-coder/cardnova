import express from "express";
import protect from "../middleware/auth.js";
import {
  listPages, createPage, updatePage, deletePage,
  getPublicPage, submitEntry, listEntries, deleteEntry,
} from "../controllers/pageController.js";

const router = express.Router();

// Public (no login) — what a scan opens
router.get("/public/:slug", getPublicPage);
router.post("/public/:slug/entry", submitEntry);

// Owner only
router.get("/entries", protect, listEntries);
router.delete("/entries/:id", protect, deleteEntry);
router.get("/", protect, listPages);
router.post("/", protect, createPage);
router.put("/:id", protect, updatePage);
router.delete("/:id", protect, deletePage);

export default router;
