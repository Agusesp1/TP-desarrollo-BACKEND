const usuarioModel = require('../models/usuario.model');

// Controlador para el Registro de Usuario
const registro = async (req, res) => {
  const { nombre, apellido, dni, fechaNac, email, password } = req.body;

  // 1. Validación de campos obligatorios
  if (!nombre || !apellido || !dni || !fechaNac || !email || !password) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Todos los campos son obligatorios'
    });
  }

  try {
    // 2. Verificar si el email ya existe
    const usuarioExistenteEmail = await usuarioModel.buscarPorEmail(email);
    if (usuarioExistenteEmail) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El correo electrónico ya se encuentra registrado'
      });
    }

    // 3. Verificar si el DNI ya existe
    const usuarioExistenteDni = await usuarioModel.buscarPorDni(dni);
    if (usuarioExistenteDni) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El DNI ya se encuentra registrado'
      });
    }

    // 4. Crear el usuario
    const nuevoUsuario = await usuarioModel.crearUsuario({
      nombre,
      apellido,
      dni,
      fechaNac,
      email,
      password
    });

    return res.status(201).json({
      exito: true,
      mensaje: 'Usuario registrado exitosamente',
      usuario: nuevoUsuario
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

// Controlador para el Inicio de Sesión (Login)
const login = async (req, res) => {
  const { email, password } = req.body;

  // 1. Validación de campos obligatorios
  if (!email || !password) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Debes ingresar el correo electrónico y la contraseña'
    });
  }

  try {
    // 2. Buscar usuario por email
    const usuario = await usuarioModel.buscarPorEmail(email);
    if (!usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales inválidas (correo electrónico no registrado)'
      });
    }

    // 3. Verificar contraseña
    if (usuario.password !== password) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales inválidas (contraseña incorrecta)'
      });
    }

    // 4. Excluir contraseña de la respuesta por seguridad
    const { password: _, ...datosUsuario } = usuario;

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
