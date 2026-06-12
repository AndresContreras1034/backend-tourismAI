// db config
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

/* =========================================================
   🔥 DEBUG: ENVIRONMENT CHECK (CLAVE PARA TU BUG ACTUAL)
========================================================= */
console.log("📦 [ENV] DB CONFIG LOADED:");
console.log("   DB_HOST:", process.env.DB_HOST);
console.log("   DB_PORT:", process.env.DB_PORT);
console.log("   DB_USER:", process.env.DB_USER);
console.log("   DB_NAME:", process.env.DB_NAME);

/* =========================================================
   🔥 POOL DE CONEXIONES
========================================================= */
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/* =========================================================
   🧠 LOG: conexión inicial (SOLO EVENTOS REALES)
========================================================= */
pool.on("connect", () => {
  console.log("🟢 [DB] Nueva conexión física establecida con PostgreSQL");
});

pool.on("error", (err) => {
  console.error("🔴 [DB] Error inesperado en pool:", err);
});

/* =========================================================
   🧪 TEST REAL DE CONEXIÓN (AL CARGAR MÓDULO)
========================================================= */
const testBootConnection = async () => {
  try {
    console.log("🧪 [DB] Probando conexión inicial...");

    const res = await pool.query("SELECT current_database(), NOW()");
    
    console.log("🟢 [DB] Conectado correctamente a:");
    console.log("   DB:", res.rows[0].current_database);
    console.log("   TIME:", res.rows[0].now);

  } catch (err) {
    console.error("🔴 [DB] Error en conexión inicial:", err.message);
  }
};

testBootConnection();

/* =========================================================
   🔥 QUERY WRAPPER CON DEBUG PROFUNDO
========================================================= */
export const query = async (text, params) => {
  const start = Date.now();

  console.log("\n📡 [DB] QUERY INICIADA");
  console.log("────────────────────────────");
  console.log(text);

  if (params?.length) {
    console.log("📦 Params:", params);
  }

  try {
    const result = await pool.query(text, params);

    const duration = Date.now() - start;

    console.log("────────────────────────────");
    console.log(`✅ [DB] OK - ${duration}ms`);
    console.log(`📊 Rows afectadas: ${result.rowCount}`);

    return result;

  } catch (error) {
    console.log("────────────────────────────");
    console.error("❌ [DB] ERROR EN QUERY");
    console.error("SQL:", text);
    console.error("Params:", params);
    console.error("Message:", error.message);

    throw error;
  }
};

/* =========================================================
   🔥 EXPORT POOL
========================================================= */
export default pool;