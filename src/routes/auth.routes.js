const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Ruta para registrar un nuevo usuario
router.post('/registro', authController.registro);

// Ruta para iniciar sesión
router.post('/login', authController.login);

module.exports = router;
