import { logInfo, logSuccess, logError } from "../../utils/logger.js";

console.log("🤖 [AI SERVICE] Inicializado");

// =========================
// 🧠 GENERAR PLANES IA
// =========================
export const generatePlans = async (profile) => {
  try {
    logInfo("AI SERVICE", "Generando planes con perfil", profile);

    // =========================================
    // 🔥 AQUÍ IRÍA OPENAI (FUTURO)
    // =========================================
    /*
    const prompt = buildPrompt(profile);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres un experto en turismo." },
        { role: "user", content: prompt }
      ]
    });

    return parseAIResponse(response);
    */

    // =========================================
    // 🧪 MOCK INTELIGENTE (ACTUAL)
    // =========================================

    const { city, budget, category, climate, priceRange } = profile;

    const basePlans = [
      {
        id: 1,
        title: `Aventura en ${city || "Colombia"}`,
        description: `Plan de ${category || "turismo"} adaptado a tu presupuesto`,
        price: budget === "low" ? 50 : budget === "medium" ? 120 : 250,
        category: category || "general",
        climate: climate || "neutral",
      },
      {
        id: 2,
        title: `Experiencia cultural en ${city || "destino local"}`,
        description: "Explora cultura, gastronomía y historia local",
        price: 80,
        category: "cultural",
        climate: "warm",
      },
      {
        id: 3,
        title: `Relax y descanso premium`,
        description: "Experiencia de desconexión total con confort",
        price: 150,
        category: "relax",
        climate: "any",
      },
    ];

    // 🔥 simulación de personalización
    const filteredPlans = basePlans.filter((plan) => {
      if (category && plan.category !== category) return false;
      return true;
    });

    logSuccess("AI SERVICE", "Planes generados correctamente", filteredPlans.length);

    return filteredPlans;
  } catch (error) {
    logError("AI SERVICE", "Error generando planes", error);
    throw error;
  }
};

// =========================
// 🧠 BUILD PROMPT (FUTURO OPENAI)
// =========================
export const buildPrompt = (profile) => {
  return `
Eres un experto en turismo personalizado.

Usuario:
- Ciudad origen: ${profile.city}
- Presupuesto: ${profile.budget}
- Tipo de plan: ${profile.category}
- Clima preferido: ${profile.climate}
- Rango de precio: ${profile.priceRange}

Genera 3 planes de viaje detallados, personalizados y atractivos.
  `.trim();
};

// =========================
// 🧠 PARSE RESPONSE (FUTURO)
// =========================
export const parseAIResponse = (response) => {
  try {
    const content = response.choices[0].message.content;

    logInfo("AI SERVICE", "Parsing respuesta IA");

    // Aquí luego parseas JSON o texto estructurado
    return content;
  } catch (error) {
    logError("AI SERVICE", "Error parseando respuesta IA", error);
    throw error;
  }
};