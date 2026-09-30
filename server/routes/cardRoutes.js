import express from "express";
import protect from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import {
  getMyCards,
  createCard,
  updateCard,
  deleteCard,
  getPublicCard,
  submitLead,
} from "../controllers/cardController.js";

const router = express.Router();

// Public routes — no login required, though optionalAuth checks for one anyway
// (used for the invite-by-email private access check)
router.get("/public/:slug", optionalAuth, getPublicCard);
router.post("/public/:slug/lead", submitLead);

// Everything below requires a signed-in user
router.use(protect);
router.get("/", getMyCards);
router.post("/", createCard);
router.put("/:id", updateCard);
router.delete("/:id", deleteCard);

export default router;
