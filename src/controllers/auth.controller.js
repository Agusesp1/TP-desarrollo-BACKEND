const crypto = require('crypto');
const User = require('../models/user.model');
const emailService = require('../services/email.service');
const quotaService = require('../services/quota.service');

// Convertir fecha de DD/MM/YYYY a YYYY-MM-DD para MySQL DATE
const formatearFechaParaMySQL = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const partes = dateStr.split('/');
    if (partes.length === 3) {
      const [day, month, year] = partes;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return dateStr;
};

// Registro de usuario (validado previamente por middleware)
const registro = async (req, res, next) => {
  const { name, lastname, dni, dateNac, email, password } = req.body;

  try {
    const dateFormateada = formatearFechaParaMySQL(dateNac);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const nuevoUsuario = await User.create({
      name: name.trim(),
      lastname: lastname.trim(),
      dni: dni.toString().trim(),
      birth_date: dateFormateada,
      email: email.trim().toLowerCase(),
      password,
      isEmailVerified: false,
      emailVerificationToken: verifyToken,
      trustedDevices: []
    });

    // Generar cuotas iniciales automáticamente para los próximos 5 meses si es socio
    if (nuevoUsuario.role === 'user') {
      try {
        await quotaService.generateInitialQuotas(nuevoUsuario.id, nuevoUsuario.enrollment_date || new Date());
      } catch (quotaErr) {
        console.warn('⚠️ No se pudieron generar las cuotas iniciales automáticamente:', quotaErr.message || quotaErr);
      }
    }

    // Enviar correo de verificación
    if (emailService.enviarMailVerificacion) {
      emailService.enviarMailVerificacion(email, verifyToken).catch((err) => {
        console.warn('Error al enviar mail de verificación:', err);
      });
    }

    const { password: _, ...datosUsuario } = nuevoUsuario.toJSON();

    return res.status(201).json({
      success: true,
      message: 'Por favor, verifica tu correo electrónico para poder iniciar sesión (si no lo encuentras en bandeja de entrada, revisa spam).',
      user: datosUsuario
    });
  } catch (error) {
    next(error);
  }
};

// Login de usuario con 2FA (credenciales y estado validados por middleware)
const login = async (req, res, next) => {
  const user = req.userFound;
  const { deviceId } = req.body;

  try {
    // Si el dispositivo ya es de confianza, inicia sesión directamente
    if (deviceId && user.trustedDevices && user.trustedDevices.includes(deviceId)) {
      const {
        password: _,
        resetPasswordToken,
        resetPasswordExpires,
        twoFactorCode,
        twoFactorCodeExpires,
        emailVerificationToken,
        trustedDevices,
        ...datosUsuario
      } = user.toJSON();

      return res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        user: datosUsuario
      });
    }

    // Generar código 2FA de 6 dígitos
    const code2FA = Math.floor(100000 + Math.random() * 900000).toString();
    const expires2FA = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    user.twoFactorCode = code2FA;
    user.twoFactorCodeExpires = expires2FA;
    await user.save();

    const emailResult = await emailService.enviarMail2FA(user.email, code2FA);
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo enviar el código de verificación por problemas con el servidor de correos.'
      });
    }

    return res.json({
      success: true,
      message: 'Código de verificación enviado al correo',
      requiresTwoFactor: true,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

// Verificar código 2FA (validado previamente por middleware)
const verify2FA = async (req, res, next) => {
  const user = req.userFound;
  const { deviceId } = req.body;

  try {
    user.twoFactorCode = null;
    user.twoFactorCodeExpires = null;

    if (deviceId) {
      let devices = user.trustedDevices || [];
      if (!devices.includes(deviceId)) {
        user.trustedDevices = [...devices, deviceId];
        user.changed('trustedDevices', true);
      }
    }

    await user.save();

    const {
      password: _,
      resetPasswordToken,
      resetPasswordExpires,
      twoFactorCode,
      twoFactorCodeExpires,
      ...datosUsuario
    } = user.toJSON();

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: datosUsuario
    });
  } catch (error) {
    next(error);
  }
};

// Solicitar recuperación de contraseña (usuario validado por middleware)
const forgotPassword = async (req, res, next) => {
  const user = req.userFound;

  try {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    const emailResult = await emailService.enviarMailRecuperacionContrasena(user.email, resetToken);
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo enviar el correo de recuperación por problemas con el servidor de correos.'
      });
    }

    return res.json({
      success: true,
      message: 'Correo de recuperación enviado con éxito'
    });
  } catch (error) {
    next(error);
  }
};

// Restablecer contraseña (token y usuario validados por middleware)
const resetPassword = async (req, res, next) => {
  const user = req.userFound;
  const { newPassword } = req.body;

  try {
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Contraseña restablecida con éxito'
    });
  } catch (error) {
    next(error);
  }
};

// Verificar correo electrónico (token y usuario validados por middleware)
const verifyEmail = async (req, res, next) => {
  const user = req.userFound;

  try {
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    const {
      password: _,
      resetPasswordToken,
      resetPasswordExpires,
      twoFactorCode,
      twoFactorCodeExpires,
      emailVerificationToken,
      trustedDevices,
      ...datosUsuario
    } = user.toJSON();

    return res.json({
      success: true,
      message: 'Correo verificado exitosamente. Iniciando sesión...',
      user: datosUsuario
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registro,
  login,
  verify2FA,
  forgotPassword,
  resetPassword,
  verifyEmail
};
