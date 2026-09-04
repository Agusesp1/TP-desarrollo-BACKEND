const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turno.controller');

router.get('/', turnoController.obtenerTurnos);
router.get('/:id', turnoController.obtenerTurnoPorId);
router.post('/', turnoController.crearTurno);
router.put('/:id', turnoController.actualizarTurno);
router.patch('/:id/toggle-estado', turnoController.toggleEstadoTurno);
router.delete('/:id', turnoController.eliminarTurno);

module.exports = router;
