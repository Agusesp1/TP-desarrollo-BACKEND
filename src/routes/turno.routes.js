const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turno.controller');
const {
  validarIdTurno,
  validarCrearTurno,
  validarActualizarTurno
} = require('../middlewares/turno.middleware');

router.get('/', turnoController.obtenerTurnos);
router.get('/:id', validarIdTurno, turnoController.obtenerTurnoPorId);
router.post('/', validarCrearTurno, turnoController.crearTurno);
router.put('/:id', validarIdTurno, validarActualizarTurno, turnoController.actualizarTurno);
router.patch('/:id/toggle-estado', validarIdTurno, turnoController.toggleEstadoTurno);
router.delete('/:id', validarIdTurno, turnoController.eliminarTurno);

module.exports = router;
