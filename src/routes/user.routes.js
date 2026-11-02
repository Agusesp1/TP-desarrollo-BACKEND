const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const {
  validateIdParam,
  validateActualizarPerfil,
  validateCambiarPassword,
  validateEliminarPerfil
} = require('../middlewares/user.middleware');

// Ruta para actualizar datos del perfil del usuario por ID
router.put('/:id', validateIdParam, validateActualizarPerfil, userController.actualizarPerfil);

// Ruta para cambiar contraseña del usuario por ID
router.put('/:id/password', validateIdParam, validateCambiarPassword, userController.cambiarPassword);

// Ruta para dar de baja lógica al usuario por ID
router.delete('/:id', validateIdParam, validateEliminarPerfil, userController.eliminarPerfil);

module.exports = router;
