const express = require('express');
const router = express.Router();
const actividadController = require('../controllers/actividad.controller');

router.get('/', actividadController.obtenerActividades);
router.get('/:id', actividadController.obtenerActividadPorId);
router.post('/', actividadController.crearActividad);
router.put('/:id', actividadController.actualizarActividad);
router.patch('/:id/toggle-estado', actividadController.toggleEstadoActividad);
router.delete('/:id', actividadController.eliminarActividad);

module.exports = router;
