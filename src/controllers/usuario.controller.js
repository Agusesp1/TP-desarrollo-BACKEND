const { Op } = require('sequelize');
const Usuario = require('../models/usuario.model');

// Actualizar información del perfil del usuario con Sequelize
const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email } = req.body;

  try {
    // 1. Verificar que el usuario exista
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    // 2. Verificar que el email no pertenezca a otro usuario
    const emailEnUso = await Usuario.findOne({
      where: {
        email,
        id: { [Op.ne]: id }
      }
    });

    if (emailEnUso) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El correo electrónico ya está en uso por otra cuenta'
      });
    }

    // 3. Actualizar el perfil con Sequelize
    await usuario.update({
      nombre,
      apellido,
      email
    });

    const { password: _, ...datosUsuario } = usuario.toJSON();

    return res.json({
      exito: true,
      mensaje: 'Perfil actualizado con éxito',
      usuario: datosUsuario
    });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al actualizar el perfil',
      detalles: error.message
    });
  }
};

// Cambiar la contraseña del usuario con Sequelize
const cambiarPassword = async (req, res) => {
  const { id } = req.params;
  const { actualPassword, nuevaPassword } = req.body;

  try {
    // 1. Buscar usuario por ID
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    // 2. Verificar contraseña actual
    if (usuario.password !== actualPassword) {
      return res.status(401).json({
        exito: false,
        mensaje: 'La contraseña actual ingresada es incorrecta'
      });
    }

    // 3. Actualizar contraseña con Sequelize
    await usuario.update({ password: nuevaPassword });

    return res.json({
      exito: true,
      mensaje: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al cambiar la contraseña',
      detalles: error.message
    });
  }
};

// Dar de baja lógica a la cuenta de usuario (estado = false) con Sequelize
const eliminarPerfil = async (req, res) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    if (!usuario.estado) {
      return res.status(400).json({
        exito: false,
        mensaje: 'La cuenta ya ha sido dada de baja previamente'
      });
    }

    await usuario.update({ estado: false });

    return res.json({
      exito: true,
      mensaje: 'La cuenta ha sido dada de baja exitosamente'
    });
  } catch (error) {
    console.error('Error al dar de baja el perfil:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al eliminar la cuenta',
      detalles: error.message
    });
  }
};

module.exports = {
  actualizarPerfil,
  cambiarPassword,
  eliminarPerfil
};
