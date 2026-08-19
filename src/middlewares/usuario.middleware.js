// Middleware para validar el parámetro ID en la URL
const validarIdParam = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de usuario proporcionado no es válido'
    });
  }

  next();
};

// Middleware para validar la actualización del perfil
const validarActualizarPerfil = (req, res, next) => {
  const { nombre, apellido, email } = req.body;

  // 1. Campos obligatorios
  if (!nombre || !apellido || !email) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre, apellido y correo electrónico son obligatorios'
    });
  }

  // 2. Límites de caracteres
  if (nombre.trim().length > 100 || apellido.trim().length > 100) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre y apellido no pueden superar los 100 caracteres'
    });
  }

  if (email.length > 150) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El correo electrónico no puede superar los 150 caracteres'
    });
  }

  // 3. Formato de correo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El formato del correo electrónico no es válido'
    });
  }

  next();
};

// Middleware para validar el cambio de contraseña
const validarCambiarPassword = (req, res, next) => {
  const { actualPassword, nuevaPassword } = req.body;

  if (!actualPassword || !nuevaPassword) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Debes ingresar la contraseña actual y la nueva contraseña'
    });
  }

  if (typeof nuevaPassword !== 'string' || nuevaPassword.length < 6) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La nueva contraseña debe tener al menos 6 caracteres'
    });
  }

  if (nuevaPassword.length > 100) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La nueva contraseña no puede superar los 100 caracteres'
    });
  }

  next();
};

module.exports = {
  validarIdParam,
  validarActualizarPerfil,
  validarCambiarPassword
};
