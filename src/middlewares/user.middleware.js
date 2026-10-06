// Middleware para validate el parámetro ID en la URL
const validateIdParam = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El ID de user proporcionado no es válido'
    });
  }

  next();
};

// Middleware para validate la actualización del profile
const validateActualizarPerfil = (req, res, next) => {
  const { name, lastname, email } = req.body;

  // 1. Campos obligatorios
  if (!name || !lastname || !email) {
    return res.status(400).json({
      success: false,
      message: 'El name, lastname y correo electrónico son obligatorios'
    });
  }

  // 2. Límites de caracteres
  if (name.trim().length > 100 || lastname.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El name y lastname no pueden superar los 100 caracteres'
    });
  }

  if (email.length > 150) {
    return res.status(400).json({
      success: false,
      message: 'El correo electrónico no puede superar los 150 caracteres'
    });
  }

  // 3. Formato de correo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  next();
};

// Middleware para validate el cambio de contraseña
const validateCambiarPassword = (req, res, next) => {
  const { actualPassword, nuevaPassword } = req.body;

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

  next();
};

module.exports = {
  validateIdParam,
  validateActualizarPerfil,
  validateCambiarPassword
};
