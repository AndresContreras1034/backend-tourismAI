// prompt builder
console.log("🧠 [PROMPT BUILDER] Inicializado");

// 🔥 Construye prompt optimizado para IA desde perfil de usuario
export const buildTravelPrompt = (profile) => {
  console.log("🧠 [PROMPT] Generando prompt desde perfil...");

  const {
    originCity,
    budget,
    travelType,
    climate,
    interests,
    companions,
    duration,
  } = profile;

  // 🧩 Normalización de datos (evita prompts rotos)
  const safeInterests = Array.isArray(interests)
    ? interests.join(", ")
    : "No especificado";

  const prompt = `
Eres un experto en turismo, planificación de viajes y experiencia de usuario.

Tu tarea es generar 3 planes de viaje personalizados, atractivos y realistas.

---

📍 CONTEXTO DEL USUARIO
- Ciudad de origen: ${originCity || "No especificado"}
- Presupuesto: ${budget || "medio"}
- Tipo de viaje: ${travelType || "general"}
- Clima preferido: ${climate || "indiferente"}
- Intereses: ${safeInterests}
- Compañía: ${companions || "no especificado"}
- Duración del viaje: ${duration || "no especificado"}

---

🎯 OBJETIVO
Generar planes que:
- Se adapten al estilo de vida del usuario
- Sean realistas según presupuesto
- Incluyan experiencias únicas y locales
- Sean variados entre sí (no repetitivos)

---

📦 FORMATO DE RESPUESTA (OBLIGATORIO JSON)
Devuelve SOLO un JSON válido con esta estructura:

{
  "plans": [
    {
      "title": "string",
      "description": "string",
      "estimatedPrice": number,
      "activities": ["string", "string", "string"],
      "locationSuggestion": "string"
    }
  ]
}

---

🚫 REGLAS IMPORTANTES
- No incluyas texto fuera del JSON
- No expliques el resultado
- No uses markdown
- Máximo 3 planes
- Debe ser coherente con Colombia o viajes internacionales según presupuesto
`;

  console.log("📦 [PROMPT BUILDER] Prompt generado:");
  console.log(prompt);

  return prompt;
};

// 🔥 Variante más agresiva (para futura mejora IA)
export const buildChatPrompt = (profile, userMessage) => {
  console.log("💬 [PROMPT] Chat personalizado generado...");

  const base = buildTravelPrompt(profile);

  return `
${base}

---

💬 MENSAJE DEL USUARIO:
${userMessage}

Responde como un asistente de viajes experto.
`;
};