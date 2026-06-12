const mfaService = require("./mfa.service");
const logger = require("../../utils/logger");

// =========================
// 🔐 SETUP MFA (GENERAR QR)
// =========================
exports.setup = async (req, res) => {
  try {
    const userId = req.user.id; // 🔥 FIX: siempre desde JWT

    const result = await mfaService.generateSetup(userId);

    return res.status(200).json({
      success: true,
      message: "MFA setup generado correctamente",
      data: {
        otpauthUrl: result.otpauthUrl,
        qrCode: result.qrCode, // base64 image
        secret: result.secret,  // backup
      },
    });

  } catch (error) {
    logger.error("MFA setup error:", error);

    return res.status(500).json({
      success: false,
      message: "Error generando MFA setup",
    });
  }
};

// =========================
// 🔐 VERIFY SETUP
// =========================
exports.verifySetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token requerido",
      });
    }

    const isValid = await mfaService.verifySetupToken(userId, token);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Código inválido",
      });
    }

    await mfaService.enableMFA(userId);

    return res.status(200).json({
      success: true,
      message: "MFA activado correctamente",
    });

  } catch (error) {
    logger.error("MFA verify setup error:", error);

    return res.status(500).json({
      success: false,
      message: "Error verificando MFA",
    });
  }
};

// =========================
// 🔐 VERIFY LOGIN MFA
// =========================
exports.verifyLogin = async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: "userId y token requeridos",
      });
    }

    const isValid = await mfaService.verifyLoginToken(userId, token);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Código MFA inválido",
      });
    }

    const jwt = await mfaService.generateLoginToken(userId);

    return res.status(200).json({
      success: true,
      message: "MFA validado correctamente",
      data: {
        token: jwt,
      },
    });

  } catch (error) {
    logger.error("MFA login verify error:", error);

    return res.status(500).json({
      success: false,
      message: "Error verificando MFA login",
    });
  }
};

// =========================
// 🔐 DISABLE MFA
// =========================
exports.disable = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    const isValid = await mfaService.verifyLoginToken(userId, token);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Código inválido",
      });
    }

    await mfaService.disableMFA(userId);

    return res.status(200).json({
      success: true,
      message: "MFA desactivado correctamente",
    });

  } catch (error) {
    logger.error("MFA disable error:", error);

    return res.status(500).json({
      success: false,
      message: "Error desactivando MFA",
    });
  }
};