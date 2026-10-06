// Middleware para validate datos de registro
const validateRegistro = (req, res, next) => {
  const { name, lastname, dni, dateNac, email, password } = req.body;

  // 1. Validate campos requeridos
  if (!name || !lastname || !dni || !dateNac || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son obligatorios'
    });
  }

  // 2. Validate longitud de contraseña
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

  // 3. Validate longitud de name y lastname
  if (name.trim().length > 100 || lastname.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El name y lastname no pueden superar los 100 caracteres'
    });
  }

  // 4. Validate correo electrónico
  if (email.length > 150) {
    return res.status(400).json({
      success: false,
      message: 'El correo electrónico no puede superar los 150 caracteres'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  // 5. Validate DNI
  if (dni.toString().length > 20) {
    return res.status(400).json({
      success: false,
      message: 'El DNI no puede superar los 20 caracteres'
    });
  }

  next();
};

// Middleware para validate datos de login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Debes ingresar el correo electrónico y la contraseña'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  next();
};

module.exports = {
  validateRegistro,
  validateLogin
};
