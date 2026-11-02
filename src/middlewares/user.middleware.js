const User = require('../models/user.model');
const { Op } = require('sequelize');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware para validar el parámetro ID en la URL y verificar que el usuario exista en BD
const validateIdParam = async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El identificador de usuario proporcionado no es válido'
    });
  }

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    req.targetUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para validar la actualización del perfil y verificar que el email no esté en uso
const validateActualizarPerfil = async (req, res, next) => {
  const { id } = req.params;
  const { name, lastname, email } = req.body;

  // 1. Campos obligatorios
  if (!name || !lastname || !email) {
    return res.status(400).json({
      success: false,
      message: 'El nombre, apellido y correo electrónico son obligatorios'
    });
  }

  // 2. Límites de caracteres
  if (name.trim().length > 100 || lastname.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El nombre y apellido no pueden superar los 100 caracteres'
    });
  }

  const emailNorm = email.trim().toLowerCase();
  if (emailNorm.length > 150 || !emailRegex.test(emailNorm)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  try {
    // 3. Verificar si el email ya pertenece a otro usuario
    const emailEnUso = await User.findOne({
      where: {
        email: emailNorm,
        id: { [Op.ne]: id }
      }
    });

    if (emailEnUso) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya está en uso por otra cuenta'
      });
    }

    req.emailNormalizado = emailNorm;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para validar el cambio de contraseña y verificar la contraseña actual
const validateCambiarPassword = async (req, res, next) => {
  const { actualPassword, nuevaPassword } = req.body;
  const user = req.targetUser; // Obtenido en validateIdParam

  if (!actualPassword || !nuevaPassword) {
    return res.status(400).json({
      success: false,
      message: 'Debes ingresar la contraseña actual y la nueva contraseña'
    });
  }

  if (typeof nuevaPassword !== 'string' || nuevaPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña debe tener al menos 6 caracteres'
    });
  }

  if (nuevaPassword.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'La nueva contraseña no puede superar los 100 caracteres'
    });
  }

  try {
    const esPasswordValida = await user.validatePassword(actualPassword);
    if (!esPasswordValida) {
      return res.status(401).json({
        success: false,
        message: 'La contraseña actual ingresada es incorrecta'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para validar baja lógica
const validateEliminarPerfil = (req, res, next) => {
  const user = req.targetUser; // Obtenido en validateIdParam

  if (!user.status) {
    return res.status(400).json({
      success: false,
      message: 'La cuenta ya ha sido dada de baja previamente'
    });
  }

  next();
};

module.exports = {
  validateIdParam,
  validateActualizarPerfil,
  validateCambiarPassword,
  validateEliminarPerfil
};
