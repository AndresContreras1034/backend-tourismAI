// plan controller
import { getProfileByUserId } from "../onboarding/profile.service.js";
import { generatePlans } from "../ai/ai.service.js";

console.log("🧭 [PLAN CONTROLLER] Inicializado");

// =========================
// 🤖 GENERAR PLANES PERSONALIZADOS (IA)
// =========================
export const getAIPlans = async (req, res) => {
  try {
    console.log("🚀 [PLANS] Generando planes con IA...");

    const userId = req.user.id;

    console.log("👤 [PLANS] Usuario:", userId);

    // 📥 obtener perfil del usuario
    const profile = await getProfileByUserId(userId);

    if (!profile) {
      console.warn("⚠️ [PLANS] Usuario sin perfil");

      return res.status(404).json({
        success: false,
        message: "Profile not found. Please complete onboarding.",
      });
    }

    console.log("🧠 [PLANS] Perfil cargado");

    // 🤖 generar planes con IA
    const plans = await generatePlans(profile);

    console.log("🟢 [PLANS] Planes generados correctamente");

    return res.status(200).json({
      success: true,
      message: "AI plans generated successfully",
      data: plans,
    });
  } catch (error) {
    console.error("❌ [PLANS ERROR]:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error generating plans",
    });
  }
};

// =========================
// 📥 PLAN MOCK / TEST (SIN IA)
// =========================
export const getMockPlans = async (req, res) => {
  try {
    console.log("🧪 [PLANS] Generando planes mock");

    const mockPlans = [
      {
        id: 1,
        title: "🏝️ Escape tropical",
        description: "Relájate en destinos cálidos con actividades ligeras",
        price: 120,
        activities: ["Playa", "Descanso", "Gastronomía local"],
      },
      {
        id: 2,
        title: "⛰️ Aventura extrema",
        description: "Experiencia llena de adrenalina",
        price: 180,
        activities: ["Senderismo", "Escalada", "Exploración"],
      },
      {
        id: 3,
        title: "🏙️ City experience",
        description: "Explora cultura urbana y vida nocturna",
        price: 150,
        activities: ["Museos", "Nightlife", "Tours guiados"],
      },
    ];

    console.log("🟢 [PLANS] Mock generado");

    return res.json({
      success: true,
      data: mockPlans,
    });
  } catch (error) {
    console.error("❌ [PLANS MOCK ERROR]:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error generating mock plans",
    });
  }
};