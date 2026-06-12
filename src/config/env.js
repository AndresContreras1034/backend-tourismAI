// env config
import dotenv from "dotenv";

dotenv.config();

// 🔥 helper para leer variables con validación
const getEnv = (key, required = true) => {
  const value = process.env[key];

  if (required && (value === undefined || value === "")) {
    console.error(`🔴 [ENV] Variable faltante: ${key}`);
    throw new Error(`Missing environment variable: ${key}`);
  }

  console.log(`🟢 [ENV] ${key} cargada correctamente`);

  return value;
};

// 🔥 export centralizado de config
const env = {
  PORT: getEnv("PORT", false) || 3000,

  DB_HOST: getEnv("DB_HOST"),
  DB_PORT: getEnv("DB_PORT", false) || 5432,
  DB_USER: getEnv("DB_USER"),
  DB_PASSWORD: getEnv("DB_PASSWORD"),
  DB_NAME: getEnv("DB_NAME"),

  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", false) || "7d",

  NODE_ENV: getEnv("NODE_ENV", false) || "development",
};

// 🔥 LOG resumen al iniciar servidor
console.log("\n📦 [ENV] Config cargada:");
console.log("--------------------------------");
Object.entries(env).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});
console.log("--------------------------------\n");

export default env;