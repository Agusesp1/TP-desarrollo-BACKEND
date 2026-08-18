const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');

// Ruta POST para enviar correos electrónicos genéricos
// Permite body: { to, subject, html }
router.post('/enviar', emailController.enviarCorreo);

// Ruta POST para recibir datos del formulario de contacto
// Permite body: { nombre, email, asunto, mensaje }
router.post('/contacto', emailController.enviarContacto);

module.exports = router;

