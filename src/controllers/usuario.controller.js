const usuarioModel = require('../models/usuario.model');

// Actualizar información del perfil del usuario
const actualizarPerfil = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email } = req.body;

  // 1. Validación de campos obligatorios
  if (!nombre || !apellido || !email) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre, apellido y correo electrónico son obligatorios'
    });
  }

  try {
    // 2. Verificar que el usuario exista
    const usuarioExistente = await usuarioModel.buscarPorId(id);
    if (!usuarioExistente) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    // 3. Verificar que el email no pertenezca a otro usuario
    const emailEnUso = await usuarioModel.buscarPorEmailExcluyendoId(email, id);
    if (emailEnUso) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El correo electrónico ya está en uso por otra cuenta'
      });
    }

    // 4. Actualizar el perfil
    const usuarioActualizado = await usuarioModel.actualizarPerfil(id, {
      nombre,
      apellido,
      email
    });

    return res.json({
      exito: true,
      mensaje: 'Perfil actualizado con éxito',
      usuario: usuarioActualizado
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

// Cambiar la contraseña del usuario
const cambiarPassword = async (req, res) => {
  const { id } = req.params;
  const { actualPassword, nuevaPassword } = req.body;

  // 1. Validación de campos obligatorios
  if (!actualPassword || !nuevaPassword) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Debes ingresar la contraseña actual y la nueva contraseña'
    });
  }

  if (nuevaPassword.length < 6) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La nueva contraseña debe tener al menos 6 caracteres'
    });
  }

  try {
    // 2. Buscar usuario completo (incluyendo contraseña)
    const usuario = await usuarioModel.buscarPorEmail((await usuarioModel.buscarPorId(id))?.email || '');

    if (!usuario) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    // 3. Verificar que la contraseña actual sea correcta
    if (usuario.password !== actualPassword) {
      return res.status(401).json({
        exito: false,
        mensaje: 'La contraseña actual ingresada es incorrecta'
      });
    }

    // 4. Actualizar contraseña
    await usuarioModel.actualizarPassword(id, nuevaPassword);

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

module.exports = {
  actualizarPerfil,
  cambiarPassword
};
