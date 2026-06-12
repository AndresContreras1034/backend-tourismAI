// ai routes
import express from "express";
import { authMiddleware } from "../auth/auth.middleware.js";

const router = express.Router();

console.log("🤖 [AI ROUTES] Inicializando rutas de IA");

// 🔥 GENERAR PLANES PERSONALIZADOS
router.post("/generate-plans", authMiddleware, async (req, res) => {
  try {
    console.log("🧠 [AI] Solicitud de generación de planes recibida");

    const userId = req.user?.id;
    const profile = req.body;

    console.log("👤 Usuario ID:", userId);
    console.log("📦 Perfil recibido:", profile);

    // 🔥 SIMULACIÓN (aquí luego conectas OpenAI o tu modelo)
    const mockPlans = [
      {
        id: 1,
        title: "Aventura en la naturaleza",
        description: "Plan personalizado basado en tus intereses",
        price: 120,
      },
      {
        id: 2,
        title: "Experiencia cultural",
        description: "Explora cultura local según tu perfil",
        price: 80,
      },
      {
        id: 3,
        title: "Relax total",
        description: "Descanso y desconexión total",
        price: 150,
      },
    ];

    console.log("🟢 [AI] Planes generados correctamente");

    return res.status(200).json({
      success: true,
      message: "Plans generated successfully",
      data: mockPlans,
    });
  } catch (error) {
    console.error("❌ [AI] Error generando planes:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error generating AI plans",
    });
  }
});

// 🔥 TEST DE IA (debug)
router.get("/test", authMiddleware, (req, res) => {
  console.log("🧪 [AI] Test endpoint ejecutado");

  res.json({
    success: true,
    message: "AI module working correctly",
  });
});

export default router;