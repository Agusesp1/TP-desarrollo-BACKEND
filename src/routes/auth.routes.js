const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegistro, validateLogin } = require('../middlewares/auth.middleware');

// Route para registrar un nuevo user con validación en middleware
router.post('/registro', validateRegistro, authController.registro);

// Route para iniciar sesión con validación en middleware
router.post('/login', validateLogin, authController.login);

// Route para verificar el código 2FA
router.post('/verify-2fa', authController.verify2FA);

// Route para solicitar recuperación de contraseña
router.post('/forgot-password', authController.forgotPassword);

// Route para restablecer la contraseña
router.post('/reset-password', authController.resetPassword);

module.exports = router;
