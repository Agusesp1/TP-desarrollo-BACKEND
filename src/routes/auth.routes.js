const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validarRegistro, validarLogin } = require('../middlewares/auth.middleware');

// Ruta para registrar un nuevo usuario con validación en middleware
router.post('/registro', validarRegistro, authController.registro);

// Ruta para iniciar sesión con validación en middleware
router.post('/login', validarLogin, authController.login);

module.exports = router;
