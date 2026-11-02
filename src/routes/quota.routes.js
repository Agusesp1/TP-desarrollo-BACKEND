const express = require('express');
const router = express.Router();
const quotaController = require('../controllers/quota.controller');
const {
  validateObtenerMisCuotas,
  validateCrearPrecioCuota,
  validatePagoManual,
  validatePreferenciaMP
} = require('../middlewares/quota.middleware');

// 1. Rutas de Precios programados
router.get('/prices', quotaController.obtenerHistorialPrecios);
router.post('/prices', validateCrearPrecioCuota, quotaController.crearOActualizarPrecio);

// 2. Consulta de cuotas
router.get('/mis-quotas', validateObtenerMisCuotas, quotaController.obtenerMisCuotas);
router.get('/user/:user_id', validateObtenerMisCuotas, quotaController.obtenerMisCuotas);
router.get('/', quotaController.obtenerTodasCuotas);

// 3. Pago manual / en caja
router.post('/pagar', validatePagoManual, quotaController.pagarCuotaManual);
router.post('/:id/pagar', validatePagoManual, quotaController.pagarCuotaManual);

// 4. Preparación e integración con Mercado Pago
router.post('/preferencia-mp', validatePreferenciaMP, quotaController.crearPreferenciaMP);
router.post('/:id/preferencia-mp', validatePreferenciaMP, quotaController.crearPreferenciaMP);
router.post('/mercadopago/webhook', quotaController.webhookMercadoPago);

// 5. Confirmación de pago de Mercado Pago
router.post('/mercadopago/confirmar', quotaController.confirmarPagoMP);
router.get('/mercadopago/confirmar', quotaController.confirmarPagoMP);
router.post('/mercadopago/success', quotaController.confirmarPagoMP);
router.get('/mercadopago/success', quotaController.confirmarPagoMP);
router.post('/confirmar', quotaController.confirmarPagoMP);
router.get('/confirmar', quotaController.confirmarPagoMP);

module.exports = router;
