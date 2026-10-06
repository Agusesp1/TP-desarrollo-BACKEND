const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');
const { validateContacto } = require('../middlewares/email.middleware');

// Route POST para enviar correos electrónicos genéricos
router.post('/enviar', emailController.enviarCorreo);

// Route POST para recibir datos del formulario de contacto con validación en middleware
router.post('/contacto', validateContacto, emailController.enviarContacto);

module.exports = router;
