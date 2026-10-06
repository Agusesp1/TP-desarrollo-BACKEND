const { Op } = require('sequelize');
const User = require('../models/user.model');

// Actualizar información del profile del user con Sequelize
const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  const { name, lastname, email } = req.body;

  try {
    // 1. Verificar que el user exista
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User no encontrado'
      });
    }

    // 2. Verificar que el email no pertenezca a otro user
    const emailEnUso = await User.findOne({
      where: {
        email,
        id: { [Op.ne]: id }
      }
    });

    if (emailEnUso) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya está en uso por otra cuenta'
      });
    }

    // 3. Actualizar el profile con Sequelize
    await user.update({
      name,
      lastname,
      email
    });

    const { password: _, ...datosUsuario } = user.toJSON();

    return res.json({
      success: true,
      message: 'Profile actualizado con éxito',
      user: datosUsuario
    });
  } catch (error) {
    console.error('Error al actualizar el profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar el profile',
      detalles: error.message
    });
  }
};

// Cambiar la contraseña del user con Sequelize
const cambiarPassword = async (req, res) => {
  const { id } = req.params;
  const { actualPassword, nuevaPassword } = req.body;

  try {
    // 1. Buscar user por ID
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User no encontrado'
      });
    }

    // 2. Verificar contraseña actual de forma segura con bcrypt
    const esPasswordValida = await user.validatePassword(actualPassword);
    if (!esPasswordValida) {
      return res.status(401).json({
        success: false,
        message: 'La contraseña actual ingresada es incorrecta'
      });
    }

    // 3. Actualizar contraseña con Sequelize
    await user.update({ password: nuevaPassword });

    return res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al cambiar la contraseña',
      detalles: error.message
    });
  }
};

// Dar de baja lógica a la cuenta de user (status = false) con Sequelize
const eliminarPerfil = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User no encontrado'
      });
    }

    if (!user.status) {
      return res.status(400).json({
        success: false,
        message: 'La cuenta ya ha sido dada de baja previamente'
      });
    }

    await user.update({ status: false });

    return res.json({
      success: true,
      message: 'La cuenta ha sido dada de baja exitosamente'
    });
  } catch (error) {
    console.error('Error al dar de baja el profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar la cuenta',
      detalles: error.message
    });
  }
};

module.exports = {
  actualizarPerfil,
  cambiarPassword,
  eliminarPerfil
};
