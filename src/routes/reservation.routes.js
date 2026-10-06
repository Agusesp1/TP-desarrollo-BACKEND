const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');

// Routes de Reservations
router.post('/', reservationController.crearReserva);
router.get('/user/:user_id', reservationController.obtenerReservasUsuario);
router.delete('/:id', reservationController.cancelarReserva);

module.exports = router;
