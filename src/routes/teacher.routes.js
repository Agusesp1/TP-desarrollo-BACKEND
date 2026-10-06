const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const {
  validateIdProfesor,
  validateCrearProfesor,
  validateActualizarProfesor
} = require('../middlewares/teacher.middleware');

// Routes de teachers
router.get('/', teacherController.obtenerProfesores);
router.get('/agenda/:email', teacherController.obtenerAgendaProfesor);
router.get('/:id', validateIdProfesor, teacherController.obtenerProfesorPorId);
router.post('/', validateCrearProfesor, teacherController.crearProfesor);
router.put('/:id', validateIdProfesor, validateActualizarProfesor, teacherController.actualizarProfesor);
router.patch('/:id/toggle-status', validateIdProfesor, teacherController.toggleEstadoProfesor);
router.delete('/:id', validateIdProfesor, teacherController.eliminarProfesor);

module.exports = router;
