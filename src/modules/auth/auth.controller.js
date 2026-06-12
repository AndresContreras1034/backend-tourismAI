// auth controller
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import env from "../../config/env.js";
import { query } from "../../config/db.js";

import mfaService from "../mfa/mfa.service.js";

console.log("🔐 [AUTH CONTROLLER] Inicializado");

// =========================
// 🔥 REGISTER
// =========================
export const register = async (req, res) => {
  try {
    console.log("🧾 [AUTH] Registro iniciado");

    const { email, password, name } = req.body;

    const userExists = await query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await query(
      `INSERT INTO users (email, password, name, mfa_enabled)
       VALUES ($1, $2, $3, false)
       RETURNING id, email, name`,
      [email, hashedPassword, name]
    );

    const token = jwt.sign(
      {
        id: newUser.rows[0].id,
        email,
        mfa_verified: false,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      user: newUser.rows[0],
      token,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error registering user",
    });
  }
};

// =========================
// 🔑 LOGIN (CON MFA FLOW)
// =========================
export const login = async (req, res) => {
  try {
    console.log("🔑 [AUTH] Login iniciado");

    const { email, password } = req.body;

    const result = await query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("🟢 [AUTH] Credenciales correctas");

    // =========================
    // 🔐 MFA CHECK
    // =========================
    if (user.mfa_enabled) {
      console.log("🔐 [AUTH] MFA requerido");

      return res.json({
        success: true,
        requiresMFA: true,
        userId: user.id,
        message: "MFA required",
      });
    }

    // 🎟️ LOGIN NORMAL (SIN MFA)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        mfa_verified: true,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error logging in",
    });
  }
};

// =========================
// 🔐 VERIFY MFA LOGIN
// =========================
export const verifyMfaLogin = async (req, res) => {
  try {
    const { userId, token } = req.body;

    const isValid = await mfaService.verifyLoginToken(userId, token);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid MFA code",
      });
    }

    const result = await query(
      "SELECT id, email, name FROM users WHERE id = $1",
      [userId]
    );

    const user = result.rows[0];

    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        mfa_verified: true,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: "MFA verified",
      user,
      token: jwtToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error verifying MFA",
    });
  }
};

// =========================
// 👤 ME
// =========================
export const me = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      "SELECT id, email, name, mfa_enabled FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error getting user",
    });
  }
};