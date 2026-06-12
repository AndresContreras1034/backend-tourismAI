// plan service
import { query } from "../../config/db.js";
import { generatePlans } from "../ai/ai.service.js";

console.log("🧭 [PLAN SERVICE] Inicializado");

// =========================
// 🤖 GENERAR PLANES CON IA + GUARDAR EN DB
// =========================
export const generateAndSavePlans = async (userId, profile) => {
  try {
    console.log("🚀 [PLAN SERVICE] Generando planes para usuario:", userId);

    // 🤖 1. generar planes con IA
    const aiPlans = await generatePlans(profile);

    console.log("🧠 [PLAN SERVICE] Planes generados por IA");

    const savedPlans = [];

    // 💾 2. guardar en PostgreSQL
    for (const plan of aiPlans) {
      const result = await query(
        `
        INSERT INTO plans (
          user_id,
          title,
          description,
          price,
          activities,
          location_suggestion,
          source
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
          userId,
          plan.title,
          plan.description,
          plan.price,
          plan.activities,
          plan.locationSuggestion || null,
          "ai",
        ]
      );

      savedPlans.push(result.rows[0]);
    }

    console.log("🟢 [PLAN SERVICE] Planes guardados en DB:", savedPlans.length);

    return savedPlans;
  } catch (error) {
    console.error("❌ [PLAN SERVICE ERROR]:", error.message);
    throw error;
  }
};

// =========================
// 📥 OBTENER HISTORIAL DE PLANES
// =========================
export const getUserPlans = async (userId) => {
  try {
    console.log("📥 [PLAN SERVICE] Obteniendo planes del usuario:", userId);

    const result = await query(
      `
      SELECT *
      FROM plans
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    console.log("🟢 [PLAN SERVICE] Planes encontrados:", result.rows.length);

    return result.rows;
  } catch (error) {
    console.error("❌ [PLAN SERVICE ERROR]:", error.message);
    throw error;
  }
};

// =========================
// ❤️ FEEDBACK (LIKE / DISLIKE)
// =========================
export const ratePlan = async (planId, userId, rating) => {
  try {
    console.log("⭐ [PLAN SERVICE] Rating plan:", planId);

    const result = await query(
      `
      UPDATE plans
      SET rating = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
      `,
      [rating, planId, userId]
    );

    if (result.rows.length === 0) {
      console.warn("⚠️ [PLAN SERVICE] Plan no encontrado o no pertenece al usuario");
      return null;
    }

    console.log("🟢 [PLAN SERVICE] Rating actualizado");

    return result.rows[0];
  } catch (error) {
    console.error("❌ [PLAN SERVICE ERROR]:", error.message);
    throw error;
  }
};