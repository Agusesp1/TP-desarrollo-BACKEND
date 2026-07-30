const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');

// Ruta para actualizar datos del perfil del usuario por ID
router.put('/:id', usuarioController.actualizarPerfil);

// Ruta para cambiar contraseña del usuario por ID
router.put('/:id/password', usuarioController.cambiarPassword);

module.exports = router;
