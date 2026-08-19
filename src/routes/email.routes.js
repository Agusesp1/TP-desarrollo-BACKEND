const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');
const { validarContacto } = require('../middlewares/email.middleware');

// Ruta POST para enviar correos electrónicos genéricos
router.post('/enviar', emailController.enviarCorreo);

// Ruta POST para recibir datos del formulario de contacto con validación en middleware
router.post('/contacto', validarContacto, emailController.enviarContacto);

module.exports = router;
