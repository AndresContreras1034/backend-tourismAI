import express from "express";
import cors from "cors";

import env from "./config/env.js";
import { query } from "./config/db.js";

// 🧱 Models
import { createUsersTable } from "./modules/users/user.model.js";
import { createProfilesTable } from "./modules/onboarding/profile.model.js";
import { createPlansTable } from "./modules/plans/plan.model.js";
import { createReviewsTable } from "./modules/reviews/review.schema.js";

// 🔐 Routes
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import profileRoutes from "./modules/onboarding/profile.routes.js";
import planRoutes from "./modules/plans/plan.routes.js";
import reviewRoutes from "./modules/reviews/review.routes.js";
import mfaRoutes from "./modules/mfa/mfa.routes.js";

// 🧠 Utils
import { logInfo, logSuccess, logError } from "./utils/logger.js";
import errorMiddleware from "./middleware/error.middleware.js";

console.log("🚀 [APP] Inicializando servidor...");

const app = express();

/* =========================
   🔧 MIDDLEWARES BASE (FIX IMPORTANTE)
========================= */

// 🔥 FIX 1: CORS bien configurado (evita problemas con fetch + headers auth)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// 🔥 FIX 2: JSON FIRST SIEMPRE
app.use(express.json());

logInfo("APP", "Middlewares cargados correctamente");

/* =========================
   🧱 INIT DATABASE
========================= */

const initDB = async () => {
  try {
    logInfo("DB", "Creando tablas si no existen...");

    await query(createUsersTable);
    await query(createProfilesTable);
    await query(createPlansTable);
    await query(createReviewsTable);

    logSuccess("DB", "Tablas listas correctamente");
  } catch (error) {
    logError("DB", "Error inicializando base de datos", error);
  }
};

/* =========================
   🌍 HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "🚀 API Tourism AI running",
  });
});

/* =========================
   🔐 ROUTES (ORDEN CORRECTO IMPORTANTE)
========================= */

// AUTH
app.use("/auth", authRoutes);

// MFA (DEBE IR DESPUÉS DE AUTH PERO ANTES DE ERROR HANDLER)
app.use("/mfa", mfaRoutes);

// MODULES
app.use("/user", userRoutes);
app.use("/profile", profileRoutes);
app.use("/plans", planRoutes);
app.use("/reviews", reviewRoutes);

logSuccess("APP", "Rutas registradas correctamente");

/* =========================
   ❌ ERROR HANDLER (DEBE IR AL FINAL SIEMPRE)
========================= */
app.use(errorMiddleware);

/* =========================
   🚀 INIT DB
========================= */
initDB();

export default app;