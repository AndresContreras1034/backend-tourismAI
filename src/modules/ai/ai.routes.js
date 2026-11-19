// ai routes
import express from "express";
import multer from "multer";
import {
  generateExpoChatReply,
  generateExpoPlan,
  getTomorrowWeather,
} from "./ai.service.js";

const router = express.Router();
const EXPO_BUDGETS = new Set(["economico", "medio", "alto"]);
const EXPO_COMPANIONS = new Set(["solo", "pareja", "amigos", "familia"]);
const EXPO_TRAVEL_TYPES = new Set([
  "compras",
  "cultural",
  "gastronomia",
  "naturaleza",
  "relax",
  "vida_nocturna",
]);
const EXPO_RATE_WINDOW_MS = 60_000;
const expoRequests = new Map();
const expoChatRequests = new Map();
const expoWeatherRequests = new Map();
const EXPO_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const expoPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: EXPO_PHOTO_MAX_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ]);
    if (allowedTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "photo"));
  },
});

console.log("🤖 [AI ROUTES] Inicializando rutas de IA");

function requireAuth(req, res, next) {
  import("../auth/auth.middleware.js")
    .then(({ authMiddleware }) => authMiddleware(req, res, next))
    .catch(next);
}

function allowLimitedRequest(requests, ip, limit, now = Date.now()) {
  const current = requests.get(ip);
  if (!current || now - current.startedAt >= EXPO_RATE_WINDOW_MS) {
    if (requests.size >= 1000) {
      for (const [address, request] of requests) {
        if (now - request.startedAt >= EXPO_RATE_WINDOW_MS) {
          requests.delete(address);
        }
      }
      if (requests.size >= 1000) return false;
    }
    requests.set(ip, { startedAt: now, count: 1 });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function allowExpoRequest(ip, now = Date.now()) {
  return allowLimitedRequest(expoRequests, ip, 5, now);
}

function allowExpoChatRequest(ip, now = Date.now()) {
  return allowLimitedRequest(expoChatRequests, ip, 12, now);
}

function limitExpoWeather(req, res, next) {
  if (!allowLimitedRequest(expoWeatherRequests, req.ip, 30)) {
    res.set("Retry-After", "60");
    return res.status(429).json({
      success: false,
      message: "El clima alcanzó el límite temporal. Inténtalo en un minuto.",
    });
  }
  next();
}

function limitExpoChat(req, res, next) {
  if (!allowExpoChatRequest(req.ip)) {
    res.set("Retry-After", "60");
    return res.status(429).json({
      success: false,
      message: "ClaudIA alcanzó el límite temporal. Inténtalo de nuevo en un minuto.",
    });
  }
  next();
}

function isBogotaCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 4.45 &&
    lat <= 4.86 &&
    lng >= -74.23 &&
    lng <= -73.9
  );
}

function sanitizeMapPoint(point) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!isBogotaCoordinate(lat, lng)) return null;

  return {
    id: isText(point.id, 100) ? point.id : "",
    name: isText(point.name || point.title, 160)
      ? (point.name || point.title).slice(0, 160)
      : "",
    location: isText(point.location, 160) ? point.location : "",
    time: isText(point.time, 30) ? point.time : "",
    lat,
    lng,
    source: isText(point.source, 80) ? point.source : "",
    approximate: point.approximate === true,
    kind: point.kind === "parking" ? "parking" : "itinerary",
    description: isText(point.description, 240) ? point.description : "",
    details: Array.isArray(point.details)
      ? point.details.filter((detail) => isText(detail, 120)).slice(0, 4)
      : [],
  };
}

function getImageMimeType(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))
  ) {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function parseExpoChatForm(req, res, next) {
  if (!req.is("multipart/form-data")) {
    next();
    return;
  }

  expoPhotoUpload.single("photo")(req, res, (error) => {
    if (error) {
      const tooLarge =
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE";
      if (!(error instanceof multer.MulterError)) {
        console.error("[AI] No se pudo procesar la foto de ClaudIA:", error);
      }
      return res.status(tooLarge ? 413 : 400).json({
        success: false,
        message: tooLarge
          ? "La foto supera el límite de 5 MB."
          : "La foto debe ser JPEG, PNG, GIF o WebP.",
      });
    }

    if (req.file) {
      const detectedMimeType = getImageMimeType(req.file.buffer);
      if (!detectedMimeType || detectedMimeType !== req.file.mimetype) {
        return res.status(400).json({
          success: false,
          message: "El contenido de la foto no coincide con su formato.",
        });
      }
      req.image = {
        buffer: req.file.buffer,
        mimeType: detectedMimeType,
      };
    }

    next();
  });
}

function parseJsonField(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isText(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function sanitizeLocalPlan(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return null;

  const priceRange = {};
  const allowedPrices = ["breakfast", "coffee", "meal", "snack"];
  for (const key of allowedPrices) {
    const value = plan.budget?.price_range?.[key];
    if (typeof value === "string" && /^\d{1,6}(?:-\d{1,6})?$/.test(value)) {
      priceRange[key] = value;
    }
  }

  const routes = Array.isArray(plan.routes)
    ? plan.routes.slice(0, 6).map((route) => ({
        type: isText(route?.type, 30) ? route.type : "sin especificar",
        duration_min: Number.isInteger(route?.duration_min)
          ? Math.max(0, Math.min(route.duration_min, 1440))
          : null,
        estimated_price: Number.isInteger(route?.estimated_price)
          ? Math.max(0, Math.min(route.estimated_price, 2_000_000))
          : null,
      }))
    : [];

  return {
    title: isText(plan.title, 120) ? plan.title : "",
    location: isText(plan.location, 100) ? plan.location : "",
    description: isText(plan.description, 400) ? plan.description : "",
    summary: isText(plan.summary, 400) ? plan.summary : "",
    local_insight: isText(plan.local_insight, 400) ? plan.local_insight : "",
    estimated_total_cop: Number.isInteger(plan.budget?.estimated_total)
      ? Math.max(0, Math.min(plan.budget.estimated_total, 5_000_000))
      : null,
    price_range_cop: priceRange,
    highlights: Array.isArray(plan.highlights)
      ? plan.highlights.filter((item) => isText(item, 120)).slice(0, 8)
      : [],
    routes,
    best_hours: Array.isArray(plan.best_hours)
      ? plan.best_hours.filter((item) => isText(item, 20)).slice(0, 8)
      : [],
    avoid_hours: Array.isArray(plan.avoid_hours)
      ? plan.avoid_hours.filter((item) => isText(item, 20)).slice(0, 8)
      : [],
    safety_tips: Array.isArray(plan.safety_tips)
      ? plan.safety_tips.filter((item) => isText(item, 240)).slice(0, 8)
      : [],
    price_alerts: Array.isArray(plan.price_alerts)
      ? plan.price_alerts
          .filter((item) => isText(item?.message, 240))
          .slice(0, 6)
          .map((item) => item.message)
      : [],
  };
}

function getExpoPlanValidationErrors(plan) {
  const priceKeys = ["food", "drink", "beer", "transport", "daily_total"];
  const validPrice = (price) =>
    price &&
    ["min", "average", "max"].every(
      (key) =>
        Number.isFinite(price[key]) &&
        price[key] >= 0 &&
        price[key] <= 5_000_000
    ) &&
    price.min <= price.average &&
    price.average <= price.max;
  const validRows = (rows, required, priceKey, min, max) =>
    Array.isArray(rows) &&
    rows.length >= min &&
    rows.length <= max &&
    rows.every(
      (row) =>
        row &&
        required.every((key) => isText(row[key], 240)) &&
        Number.isInteger(row[priceKey]) &&
        row[priceKey] >= 0 &&
        row[priceKey] <= 5_000_000
    );

  const checks = {
    overview: isText(plan?.overview, 600),
    selection_reason: isText(plan?.selection_reason, 400),
    prices:
      plan?.averages_cop &&
      priceKeys.every((key) => validPrice(plan.averages_cop[key])),
    restaurants: validRows(
      plan?.restaurants,
      ["name", "neighborhood", "specialty", "why"],
      "price_per_person_cop",
      2,
      4
    ),
    curiosities:
      Array.isArray(plan?.curiosities) &&
      plan.curiosities.length >= 2 &&
      plan.curiosities.length <= 3 &&
      plan.curiosities.every((item) => isText(item, 240)),
    itinerary:
      Array.isArray(plan?.itinerary) &&
      plan.itinerary.length >= 3 &&
      plan.itinerary.length <= 4 &&
      plan.itinerary.every(
        (item) =>
          item &&
          /^\d{2}:\d{2}$/.test(item.time) &&
          isText(item.title, 120) &&
          isText(item.location, 160) &&
          ["indoor", "outdoor", "mixed"].includes(item.setting) &&
          isText(item.description, 300)
      ),
    transport_advice:
      plan?.transport_advice &&
      ["transmilenio", "bus", "bicycle", "walking"].every((mode) =>
        isText(plan.transport_advice[mode], 240)
      ),
    practical_tips:
      Array.isArray(plan?.practical_tips) &&
      plan.practical_tips.length >= 3 &&
      plan.practical_tips.length <= 5 &&
      plan.practical_tips.every((tip) => isText(tip, 240)),
    recommendations:
      isText(plan?.weather_advice, 400) &&
      isText(plan?.parking_advice, 400) &&
      isText(plan?.verification_note, 400),
    weather:
      plan?.weather &&
      (plan.weather.available === false
        ? isText(plan.weather.message, 240)
        : plan.weather.available === true &&
          isText(plan.weather.date, 20) &&
          isText(plan.weather.condition, 80) &&
          Number.isFinite(plan.weather.temp_min_c) &&
          Number.isFinite(plan.weather.temp_max_c) &&
          Number.isFinite(plan.weather.precipitation_probability_percent) &&
          Number.isFinite(plan.weather.wind_speed_kmh)),
    map:
      isText(plan?.map_note, 240) &&
      Array.isArray(plan?.route_points) &&
      plan.route_points.length <= 4 &&
      plan.route_points.every((point) => sanitizeMapPoint(point) !== null) &&
      Array.isArray(plan?.parking_points) &&
      plan.parking_points.length <= 8 &&
      plan.parking_points.every((point) => sanitizeMapPoint(point) !== null) &&
      isText(plan?.parking_note, 240),
    quality_score:
      Number.isInteger(plan?.quality_score?.total) &&
      plan.quality_score.total >= 0 &&
      plan.quality_score.total <= 100 &&
      Array.isArray(plan.quality_score.components) &&
      plan.quality_score.components.length === 4 &&
      plan.quality_score.components.every(
        (component) =>
          isText(component.key, 40) &&
          isText(component.label, 80) &&
          Number.isInteger(component.score) &&
          component.score >= 0 &&
          component.score <= 100
      ) &&
      isText(plan?.quality_score?.method, 240),
  };

  return Object.entries(checks)
    .filter(([, valid]) => !valid)
    .map(([field]) => field);
}

function sanitizeChatContext(context) {
  const plan = context?.plan;
  const weather = plan?.weather;
  if (
    !plan ||
    !isText(context?.planName, 140) ||
    !EXPO_BUDGETS.has(context?.budgetCategory) ||
    !isText(plan.overview, 600)
  ) {
    return null;
  }

  return {
    plan_name: context.planName.trim(),
    budget_category: context.budgetCategory,
    transport_modes: [
      "TransMilenio",
      "bus urbano",
      "bicicleta",
      "a pie",
    ],
    transport_advice: Object.fromEntries(
      ["transmilenio", "bus", "bicycle", "walking"].map((mode) => [
        mode,
        isText(plan.transport_advice?.[mode], 240)
          ? plan.transport_advice[mode]
          : "",
      ])
    ),
    parking_search: "Parqueaderos marcados en OpenStreetMap; confirmar acceso, tarifa y disponibilidad.",
    parking_advice: isText(plan.parking_advice, 400)
      ? plan.parking_advice
      : "",
    overview: plan.overview.slice(0, 600),
    itinerary: Array.isArray(plan.itinerary)
      ? plan.itinerary.slice(0, 4).map((item) => ({
          time: isText(item?.time, 30) ? item.time : "",
          title: isText(item?.title, 120) ? item.title : "",
          location: isText(item?.location, 160) ? item.location : "",
          setting: ["indoor", "outdoor", "mixed"].includes(item?.setting)
            ? item.setting
            : "",
          description: isText(item?.description, 300)
            ? item.description
            : "",
        }))
      : [],
    route_points: Array.isArray(plan.route_points)
      ? plan.route_points
          .slice(0, 4)
          .map(sanitizeMapPoint)
          .filter(Boolean)
      : [],
    parking_points: Array.isArray(plan.parking_points)
      ? plan.parking_points
          .slice(0, 8)
          .map(sanitizeMapPoint)
          .filter(Boolean)
      : [],
    map_note: isText(plan.map_note, 240) ? plan.map_note : "",
    parking_note: isText(plan.parking_note, 240) ? plan.parking_note : "",
    practical_tips: Array.isArray(plan.practical_tips)
      ? plan.practical_tips.filter((tip) => isText(tip, 240)).slice(0, 5)
      : [],
    weather: weather?.available
      ? {
          available: true,
          date: weather.date,
          condition: weather.condition,
          temp_min_c: weather.temp_min_c,
          temp_max_c: weather.temp_max_c,
          precipitation_probability_percent:
            weather.precipitation_probability_percent,
        }
      : { available: false },
    weather_advice: isText(plan.weather_advice, 400)
      ? plan.weather_advice
      : "",
  };
}

router.get("/expo-weather", limitExpoWeather, async (_req, res) => {
  const weather = await getTomorrowWeather();
  return res.status(200).json({ success: true, data: weather });
});

router.post("/expo-plan", async (req, res) => {
  if (!allowExpoRequest(req.ip)) {
    res.set("Retry-After", "60");
    return res.status(429).json({
      success: false,
      message: "Alcanzaste el límite temporal. Inténtalo de nuevo en un minuto.",
    });
  }

  const {
    planName,
    predictedRating,
    travelType,
    budgetCategory,
    companion,
    localPlans,
  } = req.body || {};
  if (
    !isText(planName, 140) ||
    !Number.isFinite(predictedRating) ||
    predictedRating < 0 ||
    predictedRating > 5 ||
    !EXPO_TRAVEL_TYPES.has(travelType) ||
    !EXPO_BUDGETS.has(budgetCategory) ||
    !EXPO_COMPANIONS.has(companion) ||
    !Array.isArray(localPlans) ||
    localPlans.length > 6
  ) {
    return res.status(400).json({
      success: false,
      message: "Las preferencias del plan no son válidas.",
    });
  }

  try {
    const plan = await generateExpoPlan({
      city: "Bogotá",
      plan: { name: planName.trim(), predicted_rating: predictedRating },
      preferences: {
        travel_type: travelType,
        budget: budgetCategory,
        companion,
      },
      local_plans: localPlans.map(sanitizeLocalPlan).filter(Boolean),
    });

    const invalidFields = getExpoPlanValidationErrors(plan);
    if (invalidFields.length > 0) {
      console.error(
        `[AI] DeepSeek plan failed response validation: ${invalidFields.join(", ")}`
      );
      return res.status(502).json({
        success: false,
        message: "DeepSeek devolvió un itinerario incompleto. Inténtalo de nuevo.",
      });
    }

    return res.status(200).json({ success: true, data: plan });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 502;
    console.error("[AI] No se pudo generar el plan Expo:", error.message);
    return res.status(status).json({
      success: false,
      message:
        status === 503 && error.message.includes("not configured")
          ? "El backend aún no tiene configurada DEEPSEEK_API_KEY."
          : status === 503
          ? error.providerStatus === 429
            ? "DeepSeek alcanzó su límite temporal. Espera un momento antes de volver a generar."
            : "DeepSeek rechazó la clave. Revisa la configuración del backend."
          : status === 504
            ? "DeepSeek tardó demasiado en responder. Inténtalo de nuevo."
            : "DeepSeek no pudo completar el plan después de reintentar. Vuelve a intentarlo en unos segundos.",
    });
  }
});

router.post("/expo-chat", limitExpoChat, parseExpoChatForm, async (req, res) => {
  const { planName, budgetCategory, message } = req.body || {};
  const plan = parseJsonField(req.body?.plan);
  const history = parseJsonField(req.body?.history);
  const context = sanitizeChatContext({ planName, budgetCategory, plan });
  if (
    !context ||
    !isText(message, 600) ||
    !Array.isArray(history) ||
    history.length > 8 ||
    !history.every(
      (item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        isText(item.content, 600)
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "La pregunta o el contexto de ClaudIA no son válidos.",
    });
  }

  try {
    const reply = await generateExpoChatReply({
      context,
      messages: [
        ...history,
        { role: "user", content: message.trim() },
      ],
      image: req.image || null,
    });
    return res.status(200).json({ success: true, reply });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 502;
    console.error("[AI] ClaudIA no pudo responder:", error.message);
    return res.status(status).json({
      success: false,
      message:
        status === 503 && error.message.includes("not configured")
          ? "El backend aún no tiene configurada DEEPSEEK_API_KEY."
          : status === 503
            ? "DeepSeek rechazó la clave o el límite del proveedor. Revisa la configuración del backend."
            : status === 504
              ? "ClaudIA tardó demasiado en responder. Inténtalo de nuevo."
              : "ClaudIA no pudo responder. Inténtalo de nuevo.",
    });
  }
});

// 🔥 GENERAR PLANES PERSONALIZADOS
router.post("/generate-plans", requireAuth, async (req, res) => {
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
router.get("/test", requireAuth, (req, res) => {
  console.log("🧪 [AI] Test endpoint ejecutado");

  res.json({
    success: true,
    message: "AI module working correctly",
  });
});

export default router;