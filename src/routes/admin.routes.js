const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { validateExisteUsuarioAdmin } = require('../middlewares/admin.middleware');

router.get('/estadisticas', adminController.obtenerEstadisticas);
router.get('/users', adminController.obtenerUsuarios);
router.patch('/users/:id/toggle-status', validateExisteUsuarioAdmin, adminController.toggleEstadoUsuario);

module.exports = router;
