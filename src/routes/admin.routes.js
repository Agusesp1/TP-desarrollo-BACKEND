const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

router.get('/estadisticas', adminController.obtenerEstadisticas);
router.get('/users', adminController.obtenerUsuarios);
router.patch('/users/:id/toggle-status', adminController.toggleEstadoUsuario);

module.exports = router;
