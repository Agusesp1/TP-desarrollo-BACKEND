const express = require('express');
const router = express.Router();
const profesorController = require('../controllers/profesor.controller');
const {
  validarIdProfesor,
  validarCrearProfesor,
  validarActualizarProfesor
} = require('../middlewares/profesor.middleware');

// Rutas de profesores
router.get('/', profesorController.obtenerProfesores);
router.get('/:id', validarIdProfesor, profesorController.obtenerProfesorPorId);
router.post('/', validarCrearProfesor, profesorController.crearProfesor);
router.put('/:id', validarIdProfesor, validarActualizarProfesor, profesorController.actualizarProfesor);
router.patch('/:id/toggle-estado', validarIdProfesor, profesorController.toggleEstadoProfesor);
router.delete('/:id', validarIdProfesor, profesorController.eliminarProfesor);

module.exports = router;
