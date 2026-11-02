const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const {
  validateIdSede,
  validateCrearSede,
  validateActualizarSede
} = require('../middlewares/branch.middleware');

// Rutas de sedes
router.get('/', branchController.obtenerSedes);
router.get('/:id', validateIdSede, branchController.obtenerSedePorId);
router.post('/', validateCrearSede, branchController.crearSede);
router.put('/:id', validateIdSede, validateActualizarSede, branchController.actualizarSede);
router.patch('/:id/toggle-status', validateIdSede, branchController.toggleEstadoSede);
router.delete('/:id', validateIdSede, branchController.eliminarSede);

module.exports = router;
