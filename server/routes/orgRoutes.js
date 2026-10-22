import express from "express";
import protect from "../middleware/auth.js";
import * as C from "../controllers/orgController.js";
import { orgTable } from "./orgTable.js";

const router = express.Router();
for (const [method, path, guard, handler] of orgTable(C)) {
  const args = guard === "owner" ? [protect, handler] : [handler];
  router[method.toLowerCase()](path, ...args);
}
export default router;
