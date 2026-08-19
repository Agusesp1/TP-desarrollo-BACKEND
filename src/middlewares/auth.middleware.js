// Middleware para validar datos de registro
const validarRegistro = (req, res, next) => {
  const { nombre, apellido, dni, fechaNac, email, password } = req.body;

  // 1. Validar campos requeridos
  if (!nombre || !apellido || !dni || !fechaNac || !email || !password) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Todos los campos son obligatorios'
    });
  }

  // 2. Validar longitud de contraseña
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  if (password.length > 100) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La contraseña no puede superar los 100 caracteres'
    });
  }

  // 3. Validar longitud de nombre y apellido
  if (nombre.trim().length > 100 || apellido.trim().length > 100) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre y apellido no pueden superar los 100 caracteres'
    });
  }

  // 4. Validar correo electrónico
  if (email.length > 150) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El correo electrónico no puede superar los 150 caracteres'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El formato del correo electrónico no es válido'
    });
  }

  // 5. Validar DNI
  if (dni.toString().length > 20) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El DNI no puede superar los 20 caracteres'
    });
  }

  next();
};

// Middleware para validar datos de login
const validarLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Debes ingresar el correo electrónico y la contraseña'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El formato del correo electrónico no es válido'
    });
  }

  next();
};

module.exports = {
  validarRegistro,
  validarLogin
};
