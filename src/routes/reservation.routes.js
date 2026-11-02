const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');
const {
  validateCrearReserva,
  validateCancelarReserva
} = require('../middlewares/reservation.middleware');

// Rutas de Reservas
router.post('/', validateCrearReserva, reservationController.crearReserva);
router.get('/user/:user_id', reservationController.obtenerReservasUsuario);
router.delete('/:id', validateCancelarReserva, reservationController.cancelarReserva);

module.exports = router;
