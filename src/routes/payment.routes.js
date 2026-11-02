const express = require('express');
const router = express.Router();
const {
  crearPreferenciaPago,
  recibirWebhook,
  confirmarPago
} = require('../controllers/payment.controller');
const { validatePreferenciaMP } = require('../middlewares/quota.middleware');

// Ruta para generar el link de pago
router.post('/create-preference', validatePreferenciaMP, crearPreferenciaPago);

// Rutas de confirmación de pago de Mercado Pago
router.post('/confirmar', confirmarPago);
router.get('/confirmar', confirmarPago);
router.post('/mercadopago/confirmar', confirmarPago);
router.get('/mercadopago/confirmar', confirmarPago);
router.post('/success', confirmarPago);
router.get('/success', confirmarPago);

// Ruta para recibir notificaciones (webhooks) de Mercado Pago (pública)
router.post('/webhook', recibirWebhook);

module.exports = router;
