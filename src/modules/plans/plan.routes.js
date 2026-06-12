// plan routes
import express from "express";

import {
  getAIPlans,
  getMockPlans,
} from "./plan.controller.js";

import { authMiddleware } from "../auth/auth.middleware.js";

console.log("🧭 [PLAN ROUTES] Inicializando rutas de planes");

const router = express.Router();

// =========================
// 🤖 PLANES CON IA (CORE)
// =========================
router.get("/ai", authMiddleware, async (req, res, next) => {
  console.log("➡️ [ROUTE] GET /plans/ai");

  getAIPlans(req, res).catch(next);
});

// =========================
// 🧪 PLANES MOCK (TEST)
// =========================
router.get("/mock", authMiddleware, async (req, res, next) => {
  console.log("➡️ [ROUTE] GET /plans/mock");

  getMockPlans(req, res).catch(next);
});

export default router;