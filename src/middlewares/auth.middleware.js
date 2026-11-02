const User = require('../models/user.model');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware para validar datos de registro y unicidad de email y DNI
const validateRegistro = async (req, res, next) => {
  const { name, lastname, dni, dateNac, email, password } = req.body;

  // 1. Validar campos requeridos
  if (!name || !lastname || !dni || !dateNac || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son obligatorios'
    });
  }

  // 2. Validar longitud de contraseña
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  if (password.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña no puede superar los 100 caracteres'
    });
  }

  // 3. Validar longitud de nombre y apellido
  if (name.trim().length > 100 || lastname.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El nombre y apellido no pueden superar los 100 caracteres'
    });
  }

  // 4. Validar formato de correo
  if (email.length > 150 || !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  // 5. Validar DNI
  const dniStr = dni.toString().trim();
  if (dniStr.length > 20 || !/^\d+$/.test(dniStr)) {
    return res.status(400).json({
      success: false,
      message: 'El DNI debe contener solo dígitos numéricos'
    });
  }

  try {
    // 6. Verificar si el email ya existe en BD
    const userExistenteEmail = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (userExistenteEmail) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado'
      });
    }

    // 7. Verificar si el DNI ya existe en BD
    const userExistenteDni = await User.findOne({ where: { dni: dniStr } });
    if (userExistenteDni) {
      return res.status(409).json({
        success: false,
        message: 'El DNI ya se encuentra registrado'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para validar datos de login, existencia de usuario, credenciales y estado
const validateLogin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Debes ingresar el correo electrónico y la contraseña'
    });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  try {
    // 1. Buscar usuario por email
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña inválido'
      });
    }

    // 2. Verificar estado activo de la cuenta
    if (!user.status) {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta ha sido dada de baja o se encuentra desactivada'
      });
    }

    // 3. Verificar contraseña de forma segura
    const esPasswordValida = await user.validatePassword(password);
    if (!esPasswordValida) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña inválido'
      });
    }

    // 4. Verificar verificación de correo
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Debes verificar tu correo electrónico antes de iniciar sesión.'
      });
    }

    req.userFound = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para verificar código 2FA
const validateVerify2FA = async (req, res, next) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      message: 'El correo electrónico y el código de verificación son obligatorios'
    });
  }

  try {
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });

    if (!user || user.twoFactorCode !== code || user.twoFactorCodeExpires < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Código de verificación inválido o expirado'
      });
    }

    req.userFound = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para solicitud de recuperación de contraseña
const validateForgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Debe ingresar un correo electrónico válido'
    });
  }

  try {
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No existe un usuario con ese correo electrónico'
      });
    }

    req.userFound = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para restablecimiento de contraseña
const validateResetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'El token de recuperación es obligatorio'
    });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener al menos 6 caracteres'
    });
  }

  try {
    const user = await User.findOne({ where: { resetPasswordToken: token } });
    if (!user || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'El token de recuperación es inválido o ha expirado'
      });
    }

    req.userFound = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para verificación de correo electrónico
const validateVerifyEmail = async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'El token de verificación es obligatorio'
    });
  }

  try {
    const user = await User.findOne({ where: { emailVerificationToken: token } });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Enlace de verificación inválido o expirado'
      });
    }

    req.userFound = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateRegistro,
  validateLogin,
  validateVerify2FA,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail
};
