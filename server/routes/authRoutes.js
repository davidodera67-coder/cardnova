import express from "express";
import protect from "../middleware/auth.js";
import { register, login, me } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);

export default router;
