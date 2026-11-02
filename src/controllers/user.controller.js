const User = require('../models/user.model');

// Actualizar información del perfil del usuario (validado previamente por middleware)
const actualizarPerfil = async (req, res, next) => {
  const user = req.targetUser;
  const { name, lastname } = req.body;
  const email = req.emailNormalizado;

  try {
    await user.update({
      name: name.trim(),
      lastname: lastname.trim(),
      email
    });

    const { password: _, ...datosUsuario } = user.toJSON();

    return res.json({
      success: true,
      message: 'Perfil actualizado con éxito',
      user: datosUsuario
    });
  } catch (error) {
    next(error);
  }
};

// Cambiar la contraseña del usuario (validada previamente por middleware)
const cambiarPassword = async (req, res, next) => {
  const user = req.targetUser;
  const { nuevaPassword } = req.body;

  try {
    await user.update({ password: nuevaPassword });

    return res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// Dar de baja lógica a la cuenta de usuario (validada previamente por middleware)
const eliminarPerfil = async (req, res, next) => {
  const user = req.targetUser;

  try {
    await user.update({ status: false });

    return res.json({
      success: true,
      message: 'La cuenta ha sido dada de baja exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener usuarios con filtros
const getUsers = async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const whereClause = { role: 'user' };

    if (category) {
      whereClause.category = category;
    }
    if (status !== undefined) {
      whereClause.status = status === 'true';
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['id', 'DESC']]
    });

    return res.json({
      success: true,
      users
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  actualizarPerfil,
  cambiarPassword,
  eliminarPerfil,
  getUsers
};
