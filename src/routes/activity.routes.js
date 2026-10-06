const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const {
  validateIdActividad,
  validateCrearActividad,
  validateActualizarActividad
} = require('../middlewares/activity.middleware');

router.get('/', activityController.obtenerActividades);
router.get('/:id', validateIdActividad, activityController.obtenerActividadPorId);
router.post('/', validateCrearActividad, activityController.crearActividad);
router.put('/:id', validateIdActividad, validateActualizarActividad, activityController.actualizarActividad);
router.patch('/:id/toggle-status', validateIdActividad, activityController.toggleEstadoActividad);
router.delete('/:id', validateIdActividad, activityController.eliminarActividad);

module.exports = router;
