const express = require('express');
const router = express.Router();
const cuotaController = require('../controllers/cuota.controller');

// 1. Rutas de Precios programados
router.get('/precios', cuotaController.obtenerHistorialPrecios);
router.post('/precios', cuotaController.crearOActualizarPrecio);

// 2. Consulta de cuotas
router.get('/mis-cuotas', cuotaController.obtenerMisCuotas);
router.get('/usuario/:usuario_id', cuotaController.obtenerMisCuotas);
router.get('/', cuotaController.obtenerTodasCuotas);

// 3. Pago manual / en caja
router.post('/pagar', cuotaController.pagarCuotaManual);
router.post('/:id/pagar', cuotaController.pagarCuotaManual);

// 4. Preparación e integración con Mercado Pago
router.post('/preferencia-mp', cuotaController.crearPreferenciaMP);
router.post('/:id/preferencia-mp', cuotaController.crearPreferenciaMP);
router.post('/mercadopago/webhook', cuotaController.webhookMercadoPago);
router.post('/mercadopago/exito', cuotaController.procesarExitoMP);
router.get('/mercadopago/exito', cuotaController.procesarExitoMP);

module.exports = router;
