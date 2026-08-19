const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const {
  validarIdParam,
  validarActualizarPerfil,
  validarCambiarPassword
} = require('../middlewares/usuario.middleware');

// Ruta para actualizar datos del perfil del usuario por ID
router.put('/:id', validarIdParam, validarActualizarPerfil, usuarioController.actualizarPerfil);

// Ruta para cambiar contraseña del usuario por ID
router.put('/:id/password', validarIdParam, validarCambiarPassword, usuarioController.cambiarPassword);

// Ruta para dar de baja lógica al usuario por ID
router.delete('/:id', validarIdParam, usuarioController.eliminarPerfil);

module.exports = router;
