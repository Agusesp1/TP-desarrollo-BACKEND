const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reserva.controller');

// Rutas de Reservas
router.post('/', reservaController.crearReserva);
router.get('/usuario/:usuario_id', reservaController.obtenerReservasUsuario);
router.delete('/:id', reservaController.cancelarReserva);

module.exports = router;
