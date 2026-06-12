import speakeasy from "speakeasy";
import QRCode from "qrcode";

import * as mfaModel from "./mfa.model.js";
import userModel from "../users/user.model.js";
import jwt from "../../utils/jwt.js";

console.log("🔐 [MFA SERVICE] Inicializado");

// =========================
// 🔐 GENERAR SETUP MFA (FIXED)
// =========================
export const generateSetup = async (userId) => {
  console.log("🧪 [MFA] Generando setup para:", userId);

  const user = await userModel.getById(userId);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const secret = speakeasy.generateSecret({
    name: `TourismAI (${user.email})`,
  });

  console.log("🔑 [MFA] Secret generado");

  const existing = await mfaModel.getMfaByUserId(userId);

  if (existing) {
    console.log("♻️ [MFA] Reset MFA existente");

    // 🔥 FIX IMPORTANTE: reset completo
    await mfaModel.updateSecret(userId, secret.base32);

    await mfaModel.disableMfa(userId); // evita estado inconsistente
  } else {
    console.log("🆕 [MFA] Creando registro MFA");

    await mfaModel.createMfaRecord({
      userId,
      secret: secret.base32,
      enabled: false, // 🔥 IMPORTANTE
    });
  }

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  console.log("📲 [MFA] QR generado");

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCode,
  };
};

// =========================
// 🔐 VERIFY SETUP TOKEN
// =========================
export const verifySetupToken = async (userId, token) => {
  console.log("🔐 [MFA] Verificando setup token");

  const record = await mfaModel.getMfaByUserId(userId);

  if (!record) return false;

  return speakeasy.totp.verify({
    secret: record.secret,
    encoding: "base32",
    token,
    window: 2, // 🔥 más tolerante
  });
};

// =========================
// 🔐 ENABLE MFA
// =========================
export const enableMFA = async (userId) => {
  console.log("✅ [MFA] Activando MFA:", userId);

  await mfaModel.enableMfa(userId);

  await userModel.update(userId, {
    mfa_enabled: true,
  });

  return true;
};

// =========================
// 🔐 VERIFY LOGIN
// =========================
export const verifyLoginToken = async (userId, token) => {
  console.log("🔐 [MFA] Verificando login MFA:", userId);

  const record = await mfaModel.getMfaByUserId(userId);

  if (!record || !record.enabled) {
    return false;
  }

  return speakeasy.totp.verify({
    secret: record.secret,
    encoding: "base32",
    token,
    window: 2,
  });
};

// =========================
// 🔐 LOGIN TOKEN
// =========================
export const generateLoginToken = async (userId) => {
  const user = await userModel.getById(userId);

  return jwt.generateToken({
    id: user.id,
    email: user.email,
    mfa_verified: true,
  });
};

// =========================
// ❌ DISABLE MFA
// =========================
export const disableMFA = async (userId) => {
  console.log("❌ [MFA] Desactivando MFA:", userId);

  await mfaModel.disableMfa(userId);

  await userModel.update(userId, {
    mfa_enabled: false,
  });

  return true;
};

export default {
  generateSetup,
  verifySetupToken,
  enableMFA,
  verifyLoginToken,
  generateLoginToken,
  disableMFA,
};