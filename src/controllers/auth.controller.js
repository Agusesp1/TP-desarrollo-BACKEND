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
    const nuevoUsuario = await User.create({
      name,
      lastname,
      dni,
      birth_date: dateFormateada,
      email,
      password
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
    emailService.enviarMailBienvenida({ name, email }).catch((err) => {
      console.warn('⚠️ No se pudo despachar el correo de bienvenida:', err.message || err);
    });

    const { password: _, ...datosUsuario } = nuevoUsuario.toJSON();

    return res.status(201).json({
      success: true,
      message: 'User registrado exitosamente',
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

// Controller para el Home de Sesión (Login) con Sequelize
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
        message: 'User o contraseña inválido'
      });
    }

    // 4. Excluir contraseña de la respuesta
    const { password: _, ...datosUsuario } = user.toJSON();

    return res.json({
      success: true,
      message: 'Home de sesión exitoso',
      user: datosUsuario
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

module.exports = {
  registro,
  login
};
