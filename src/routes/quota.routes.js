const express = require('express');
const router = express.Router();
const quotaController = require('../controllers/quota.controller');

// 1. Routes de Prices programados
router.get('/prices', quotaController.obtenerHistorialPrecios);
router.post('/prices', quotaController.crearOActualizarPrecio);

// 2. Consulta de quotas
router.get('/mis-quotas', quotaController.obtenerMisCuotas);
router.get('/user/:user_id', quotaController.obtenerMisCuotas);
router.get('/', quotaController.obtenerTodasCuotas);

// 3. Payment manual / en caja
router.post('/pagar', quotaController.pagarCuotaManual);
router.post('/:id/pagar', quotaController.pagarCuotaManual);

// 4. Preparación e integración con Mercado Payment
router.post('/preferencia-mp', quotaController.crearPreferenciaMP);
router.post('/:id/preferencia-mp', quotaController.crearPreferenciaMP);
router.post('/mercadopago/webhook', quotaController.webhookMercadoPago);

// 5. Confirmación de payment de Mercado Payment
router.post('/mercadopago/confirmar', quotaController.confirmarPagoMP);
router.get('/mercadopago/confirmar', quotaController.confirmarPagoMP);
router.post('/mercadopago/success', quotaController.confirmarPagoMP);
router.get('/mercadopago/success', quotaController.confirmarPagoMP);
router.post('/confirmar', quotaController.confirmarPagoMP);
router.get('/confirmar', quotaController.confirmarPagoMP);

module.exports = router;
