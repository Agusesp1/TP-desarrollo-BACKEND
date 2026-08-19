// Middleware para validar datos del formulario de contacto
const validarContacto = (req, res, next) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Nombre, email y mensaje son requeridos'
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
  validarContacto
};
