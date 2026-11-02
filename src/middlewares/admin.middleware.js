const User = require('../models/user.model');

// Validar parámetro ID y verificar existencia del usuario en el panel admin
const validateExisteUsuarioAdmin = async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El identificador de usuario no es válido'
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

module.exports = {
  validateExisteUsuarioAdmin
};
