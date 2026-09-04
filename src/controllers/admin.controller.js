const Usuario = require('../models/usuario.model');
const Sede = require('../models/sede.model');
const Profesor = require('../models/profesor.model');
const Actividad = require('../models/actividad.model');
const Turno = require('../models/turno.model');

// Obtener estadísticas generales para el panel de administración
const obtenerEstadisticas = async (req, res) => {
  try {
    const [
      totalSocios,
      totalProfesores,
      profesoresActivos,
      totalSedes,
      sedesActivas,
      totalActividades,
      actividadesActivas,
      totalTurnos,
      turnosActivos
    ] = await Promise.all([
      Usuario.count({ where: { rol: 'usuario', estado: true } }),
      Profesor.count(),
      Profesor.count({ where: { estado: true } }),
      Sede.count(),
      Sede.count({ where: { estado: true } }),
      Actividad.count(),
      Actividad.count({ where: { estado: true } }),
      Turno.count(),
      Turno.count({ where: { estado: true } })
    ]);

    return res.json({
      exito: true,
      estadisticas: {
        totalSocios,
        totalProfesores,
        profesoresActivos,
        totalSedes,
        sedesActivas,
        totalActividades,
        actividadesActivas,
        totalTurnos,
        turnosActivos
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del panel admin:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener estadísticas',
      detalles: error.message
    });
  }
};

module.exports = {
  obtenerEstadisticas
};
