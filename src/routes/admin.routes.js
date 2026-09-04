const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

router.get('/estadisticas', adminController.obtenerEstadisticas);

module.exports = router;
