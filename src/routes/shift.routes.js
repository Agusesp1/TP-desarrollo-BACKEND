const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shift.controller');
const {
  validateIdTurno,
  validateCrearTurno,
  validateActualizarTurno
} = require('../middlewares/shift.middleware');

router.get('/', shiftController.obtenerTurnos);
router.get('/:id', validateIdTurno, shiftController.obtenerTurnoPorId);
router.post('/', validateCrearTurno, shiftController.crearTurno);
router.put('/:id', validateIdTurno, validateActualizarTurno, shiftController.actualizarTurno);
router.patch('/:id/toggle-status', validateIdTurno, shiftController.toggleEstadoTurno);
router.delete('/:id', validateIdTurno, shiftController.eliminarTurno);

module.exports = router;
