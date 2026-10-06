const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');

// Routes de branches
router.get('/', branchController.obtenerSedes);
router.get('/:id', branchController.obtenerSedePorId);
router.post('/', branchController.crearSede);
router.put('/:id', branchController.actualizarSede);
router.patch('/:id/toggle-status', branchController.toggleEstadoSede);
router.delete('/:id', branchController.eliminarSede);

module.exports = router;
