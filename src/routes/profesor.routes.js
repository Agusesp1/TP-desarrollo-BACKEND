const express = require('express');
const router = express.Router();
const profesorController = require('../controllers/profesor.controller');

// Rutas de profesores
router.get('/', profesorController.obtenerProfesores);
router.get('/:id', profesorController.obtenerProfesorPorId);
router.post('/', profesorController.crearProfesor);
router.put('/:id', profesorController.actualizarProfesor);
router.patch('/:id/toggle-estado', profesorController.toggleEstadoProfesor);
router.delete('/:id', profesorController.eliminarProfesor);

module.exports = router;
