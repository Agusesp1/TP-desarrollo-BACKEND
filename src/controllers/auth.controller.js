const crypto = require('crypto');
const User = require('../models/user.model');
const emailService = require('../services/email.service');
const quotaService = require('../services/quota.service');

// Convertir date de DD/MM/YYYY a YYYY-MM-DD para MySQL DATE
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

// Controller para el Registro de User con Sequelize
const registro = async (req, res) => {
  const { name, lastname, dni, dateNac, email, password } = req.body;

  try {
    // 1. Verificar si el email ya existe
    const userExistenteEmail = await User.findOne({ where: { email } });
    if (userExistenteEmail) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya se encuentra registrado'
      });
    }

    // 2. Verificar si el DNI ya existe
    const userExistenteDni = await User.findOne({ where: { dni } });
    if (userExistenteDni) {
      return res.status(409).json({
        success: false,
        message: 'El DNI ya se encuentra registrado'
      });
    }

    // 3. Crear el user en la base de datos usando Sequelize
    const dateFormateada = formatearFechaParaMySQL(dateNac);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const nuevoUsuario = await User.create({
      name,
      lastname,
      dni,
      birth_date: dateFormateada,
      email,
      password,
      isEmailVerified: false,
      emailVerificationToken: verifyToken,
      trustedDevices: []
    });

    // 4. Generar quotas iniciales automáticamente para los próximos 5 meses ÚNICAMENTE si es cliente/user
    if (nuevoUsuario.role === 'user') {
      try {
        await quotaService.generateInitialQuotas(nuevoUsuario.id, nuevoUsuario.enrollment_date || new Date());
      } catch (quotaErr) {
        console.warn('⚠️ No se pudieron generar las quotas iniciales automáticamente:', quotaErr.message || quotaErr);
      }
    }

    // 5. Enviar correo de bienvenida (asíncrono, sin bloquear la respuesta)
    // 5. Enviar correo de verificación
    if (emailService.enviarMailVerificacion) {
      emailService.enviarMailVerificacion(email, verifyToken).catch((err) => {
        console.warn('Error al enviar mail de verificacion:', err);
      });
    }

    const { password: _, ...datosUsuario } = nuevoUsuario.toJSON();

    return res.status(201).json({
      success: true,
      message: 'Por favor, verifica tu correo electrónico para poder iniciar sesión.',
      user: datosUsuario
    });
  } catch (error) {
    console.error('Error en el controller de registro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al registrar el user',
      detalles: error.message
    });
  }
};

// Controller para el Home de Sesión (Login) con Sequelize y 2FA
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar user por email con Sequelize
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User o contraseña inválido'
      });
    }

    // 2. Verificar si la cuenta está activa (baja lógica)
    if (!user.status) {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta ha sido dada de baja o se encuentra desactivada'
      });
    }

    // 3. Verificar contraseña de forma segura (soporta bcrypt y migración transparente)
    const esPasswordValida = await user.validatePassword(password);
    if (!esPasswordValida) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña inválido'
      });
    }
    
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Debes verificar tu correo electrónico antes de iniciar sesión.'
      });
    }

    const { deviceId } = req.body;
    if (deviceId && user.trustedDevices && user.trustedDevices.includes(deviceId)) {
       const { password: _, resetPasswordToken, resetPasswordExpires, twoFactorCode, twoFactorCodeExpires, emailVerificationToken, trustedDevices, ...datosUsuario } = user.toJSON();
       return res.json({
         success: true,
         message: 'Inicio de sesión exitoso',
         user: datosUsuario
       });
    }


    // 4. Generar código 2FA de 6 dígitos
    const code2FA = Math.floor(100000 + Math.random() * 900000).toString();
    const expires2FA = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    
    user.twoFactorCode = code2FA;
    user.twoFactorCodeExpires = expires2FA;
    await user.save();

    // 5. Enviar correo 2FA
    const emailResult = await emailService.enviarMail2FA(user.email, code2FA);
    if (!emailResult.success) {
      console.warn('⚠️ No se pudo enviar el correo de 2FA:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'No se pudo enviar el código de verificación por problemas con el servidor de correos (SMTP)',
        detalles: emailResult.error
      });
    }

    return res.json({
      success: true,
      message: 'Código de verificación enviado al correo',
      requiresTwoFactor: true,
      email: user.email
    });
  } catch (error) {
    console.error('Error en el controller de login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al iniciar sesión',
      detalles: error.message
    });
  }
};

// Verificar el código 2FA
const verify2FA = async (req, res) => {
  const { email, code, deviceId } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    
    if (!user || user.twoFactorCode !== code || user.twoFactorCodeExpires < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Código de verificación inválido o expirado'
      });
    }

    // Limpiar 2FA
    user.twoFactorCode = null;
    user.twoFactorCodeExpires = null;
    
    if (deviceId) {
      let devices = user.trustedDevices || [];
      if (!devices.includes(deviceId)) {
        user.trustedDevices = [...devices, deviceId];
        user.changed('trustedDevices', true); // Force Sequelize to save JSON array
      }
    }
    
    await user.save();

    const { password: _, resetPasswordToken, resetPasswordExpires, twoFactorCode, twoFactorCodeExpires, ...datosUsuario } = user.toJSON();

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: datosUsuario
    });
  } catch (error) {
    console.error('Error en verificar 2FA:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al verificar el código',
      detalles: error.message
    });
  }
};

// Solicitar recuperación de contraseña
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No existe un usuario con ese correo electrónico'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    const emailResult = await emailService.enviarMailRecuperacionContrasena(user.email, resetToken);
    
    if (!emailResult.success) {
      console.warn('⚠️ No se pudo enviar correo de recuperación:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'No se pudo enviar el correo de recuperación por problemas con el servidor de correos (SMTP)',
        detalles: emailResult.error
      });
    }

    return res.json({
      success: true,
      message: 'Correo de recuperación enviado con éxito'
    });
  } catch (error) {
    console.error('Error en forgot password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al solicitar recuperación de contraseña',
      detalles: error.message
    });
  }
};

// Restablecer la contraseña
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const user = await User.findOne({ 
      where: { 
        resetPasswordToken: token
      } 
    });

    if (!user || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'El token de recuperación es inválido o ha expirado'
      });
    }

    // Actualizar contraseña (el hook beforeUpdate de Sequelize hasheará la contraseña)
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Contraseña restablecida con éxito'
    });
  } catch (error) {
    console.error('Error en reset password:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al restablecer la contraseña',
      detalles: error.message
    });
  }
};


// Verificar el correo electrónico
const verifyEmail = async (req, res) => {
  const { token } = req.body;
  try {
    const user = await User.findOne({ where: { emailVerificationToken: token } });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Enlace de verificación inválido o expirado' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    const { password: _, resetPasswordToken, resetPasswordExpires, twoFactorCode, twoFactorCodeExpires, emailVerificationToken, trustedDevices, ...datosUsuario } = user.toJSON();

    return res.json({ 
      success: true, 
      message: 'Correo verificado exitosamente. Iniciando sesión...',
      user: datosUsuario
    });
  } catch (error) {
    console.error('Error al verificar correo:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor al verificar el correo' });
  }
};

module.exports = {
  verifyEmail,
  registro,
  login,
  verify2FA,
  forgotPassword,
  resetPassword
};
