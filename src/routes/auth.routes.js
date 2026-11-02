const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {
  validateRegistro,
  validateLogin,
  validateVerify2FA,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail
} = require('../middlewares/auth.middleware');

// Ruta para registrar un nuevo usuario con validación en middleware
router.post('/registro', validateRegistro, authController.registro);

// Ruta para iniciar sesión con validación en middleware
router.post('/login', validateLogin, authController.login);

// Ruta para verificar el código 2FA
router.post('/verify-2fa', validateVerify2FA, authController.verify2FA);

// Ruta para solicitar recuperación de contraseña
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);

// Ruta para restablecer la contraseña
router.post('/reset-password', validateResetPassword, authController.resetPassword);

// Ruta para verificar email
router.post('/verify-email', validateVerifyEmail, authController.verifyEmail);

module.exports = router;
