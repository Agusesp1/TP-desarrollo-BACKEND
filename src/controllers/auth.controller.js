const Usuario = require('../models/usuario.model');
const emailService = require('../services/email.service');

// Convertir fecha de DD/MM/YYYY a YYYY-MM-DD para MySQL DATE
const formatearFechaParaMySQL = (fechaStr) => {
  if (!fechaStr) return null;
  if (fechaStr.includes('/')) {
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const [dia, mes, anio] = partes;
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
  }
  return fechaStr;
};

// Controlador para el Registro de Usuario con Sequelize
const registro = async (req, res) => {
  const { nombre, apellido, dni, fechaNac, email, password } = req.body;

  try {
    // 1. Verificar si el email ya existe
    const usuarioExistenteEmail = await Usuario.findOne({ where: { email } });
    if (usuarioExistenteEmail) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El correo electrónico ya se encuentra registrado'
      });
    }

    // 2. Verificar si el DNI ya existe
    const usuarioExistenteDni = await Usuario.findOne({ where: { dni } });
    if (usuarioExistenteDni) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El DNI ya se encuentra registrado'
      });
    }

    // 3. Crear el usuario en la base de datos usando Sequelize
    const fechaFormateada = formatearFechaParaMySQL(fechaNac);
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      dni,
      fecha_nacimiento: fechaFormateada,
      email,
      password
    });

    // 4. Enviar correo de bienvenida (asíncrono, sin bloquear la respuesta)
    emailService.enviarMailBienvenida({ nombre, email }).catch((err) => {
      console.warn('⚠️ No se pudo despachar el correo de bienvenida:', err.message || err);
    });

    const { password: _, ...datosUsuario } = nuevoUsuario.toJSON();

    return res.status(201).json({
      exito: true,
      mensaje: 'Usuario registrado exitosamente',
      usuario: datosUsuario
    });
  } catch (error) {
    console.error('Error en el controlador de registro:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al registrar el usuario',
      detalles: error.message
    });
  }
};

// Controlador para el Inicio de Sesión (Login) con Sequelize
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar usuario por email con Sequelize
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales inválidas (correo electrónico no registrado)'
      });
    }

    // 2. Verificar si la cuenta está activa (baja lógica)
    if (!usuario.estado) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Esta cuenta ha sido dada de baja o se encuentra desactivada'
      });
    }

    // 3. Verificar contraseña
    if (usuario.password !== password) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales inválidas (contraseña incorrecta)'
      });
    }

    // 4. Excluir contraseña de la respuesta
    const { password: _, ...datosUsuario } = usuario.toJSON();

    return res.json({
      exito: true,
      mensaje: 'Inicio de sesión exitoso',
      usuario: datosUsuario
    });
  } catch (error) {
    console.error('Error en el controlador de login:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor al iniciar sesión',
      detalles: error.message
    });
  }
};

module.exports = {
  registro,
  login
};
