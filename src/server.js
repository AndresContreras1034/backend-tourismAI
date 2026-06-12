// server entry
import app from "./app.js";
import env from "./config/env.js";

import { logInfo, logSuccess, logError } from "./utils/logger.js";

console.log("🚀 [SERVER] Inicializando servidor...");

// =========================
// 🚀 START SERVER
// =========================
const PORT = env.PORT || 3000;

const startServer = async () => {
  try {
    logInfo("SERVER", "Iniciando backend...");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

      logSuccess(
        "SERVER",
        `API lista en http://localhost:${PORT}`
      );
    });
  } catch (error) {
    logError("SERVER", "Error al iniciar servidor", error);
    process.exit(1);
  }
};

startServer();