const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRegistro, validateLogin } = require('../middlewares/auth.middleware');

// Route para registrar un nuevo user con validación en middleware
router.post('/registro', validateRegistro, authController.registro);

// Route para iniciar sesión con validación en middleware
router.post('/login', validateLogin, authController.login);

module.exports = router;
