const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividad.controller');
const {
  validarIdActividad,
  validarCrearActividad,
  validarActualizarActividad
} = require('../middlewares/actividad.middleware');

router.get('/', actividadController.obtenerActividades);
router.get('/:id', validarIdActividad, actividadController.obtenerActividadPorId);
router.post('/', validarCrearActividad, actividadController.crearActividad);
router.put('/:id', validarIdActividad, validarActualizarActividad, actividadController.actualizarActividad);
router.patch('/:id/toggle-estado', validarIdActividad, actividadController.toggleEstadoActividad);
router.delete('/:id', validarIdActividad, actividadController.eliminarActividad);

module.exports = router;
