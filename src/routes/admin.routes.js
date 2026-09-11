const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

router.get('/estadisticas', adminController.obtenerEstadisticas);
router.get('/usuarios', adminController.obtenerUsuarios);
router.patch('/usuarios/:id/toggle-estado', adminController.toggleEstadoUsuario);

module.exports = router;
