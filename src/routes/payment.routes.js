const express = require('express');
const router = express.Router();
const {
  crearPreferenciaPago,
  recibirWebhook,
  confirmarPago
} = require('../controllers/payment.controller');

// Route para generar el link de payment
router.post('/create-preference', crearPreferenciaPago);

// Routes de confirmación de payment de Mercado Payment
router.post('/confirmar', confirmarPago);
router.get('/confirmar', confirmarPago);
router.post('/mercadopago/confirmar', confirmarPago);
router.get('/mercadopago/confirmar', confirmarPago);
router.post('/success', confirmarPago);
router.get('/success', confirmarPago);

// Route para recibir notificaciones (webhooks) de Mercado Payment (pública)
router.post('/webhook', recibirWebhook);

module.exports = router;
