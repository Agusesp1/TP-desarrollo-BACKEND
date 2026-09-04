const express = require('express');
const router = express.Router();
const sedeController = require('../controllers/sede.controller');

// Rutas de sedes
router.get('/', sedeController.obtenerSedes);
router.get('/:id', sedeController.obtenerSedePorId);
router.post('/', sedeController.crearSede);
router.put('/:id', sedeController.actualizarSede);
router.patch('/:id/toggle-estado', sedeController.toggleEstadoSede);
router.delete('/:id', sedeController.eliminarSede);

module.exports = router;
