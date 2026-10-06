const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const {
  validateIdParam,
  validateActualizarPerfil,
  validateCambiarPassword
} = require('../middlewares/user.middleware');

// Route para actualizar datos del profile del user por ID
router.put('/:id', validateIdParam, validateActualizarPerfil, userController.actualizarPerfil);

// Route para cambiar contraseña del user por ID
router.put('/:id/password', validateIdParam, validateCambiarPassword, userController.cambiarPassword);

// Route para dar de baja lógica al user por ID
router.delete('/:id', validateIdParam, userController.eliminarPerfil);

module.exports = router;
