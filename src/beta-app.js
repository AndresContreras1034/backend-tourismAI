import cors from "cors";
import express from "express";

import aiRoutes from "./modules/ai/ai.routes.js";

const app = express();
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://frontend-tourism-ai.vercel.app",
  ...(process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);
const betaAiPaths = new Set(["/expo-plan", "/expo-chat", "/expo-weather"]);

app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "tourism-ai-beta" });
});

app.use("/ai", (req, res, next) => {
  if (!betaAiPaths.has(req.path)) {
    return res.status(404).json({
      success: false,
      message: "Esta ruta no está disponible en la beta pública.",
    });
  }
  next();
}, aiRoutes);

app.use((error, _req, res, _next) => {
  console.error("[BETA API] Error inesperado:", error);
  res.status(500).json({
    success: false,
    message: "Ocurrió un error inesperado en el backend.",
  });
});

export default app;
