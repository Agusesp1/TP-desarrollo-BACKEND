const User = require('../models/user.model');
const Branch = require('../models/branch.model');
const Teacher = require('../models/teacher.model');
const Activity = require('../models/activity.model');
const Shift = require('../models/shift.model');
const quotaService = require('../services/quota.service');

// Obtener estadísticas generales para el panel de administración
const obtenerEstadisticas = async (req, res, next) => {
  try {
    const [
      totalSocios,
      totalProfesores,
      teachersActivos,
      totalSedes,
      branchesActivas,
      totalActividades,
      activitiesActivas,
      totalTurnos,
      shiftsActivos
    ] = await Promise.all([
      User.count({ where: { role: 'user', status: true } }),
      Teacher.count(),
      Teacher.count({ where: { status: true } }),
      Branch.count(),
      Branch.count({ where: { status: true } }),
      Activity.count(),
      Activity.count({ where: { status: true } }),
      Shift.count(),
      Shift.count({ where: { status: true } })
    ]);

    return res.json({
      success: true,
      estadisticas: {
        totalSocios,
        totalProfesores,
        teachersActivos,
        totalSedes,
        branchesActivas,
        totalActividades,
        activitiesActivas,
        totalTurnos,
        shiftsActivos
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtener listado de socios y usuarios con información de cuotas
const obtenerUsuarios = async (req, res, next) => {
  try {
    await quotaService.updateQuotasStatuses();

    const { category, status } = req.query;
    const whereClause = { role: 'user' };

    if (category) {
      whereClause.category = category;
    }
    if (status !== undefined) {
      whereClause.status = status === 'true';
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['id', 'DESC']]
    });

    const usersConEstadoCuotas = await Promise.all(
      users.map(async (user) => {
        const jsonUser = user.toJSON();

        if (user.role === 'user') {
          const cobranza = await quotaService.obtenerEstadoCobranzaUsuario(user.id);
          let statusActual = user.status;
          if (cobranza.statusCuota === 'Con Deuda') {
            if (user.status) {
              await user.update({ status: false });
              statusActual = false;
            }
          }

          return {
            ...jsonUser,
            status: statusActual,
            statusCuota: cobranza.statusCuota,
            demorado: cobranza.demorado,
            alDia: cobranza.alDia,
            fechaVencimiento: cobranza.fechaVencimiento,
            cantCuotasVencidas: cobranza.cantVencidas,
            quotasVencidas: cobranza.quotasVencidas
          };
        } else {
          return {
            ...jsonUser,
            statusCuota: 'N/A',
            demorado: false,
            alDia: true,
            fechaVencimiento: null,
            cantCuotasVencidas: 0,
            quotasVencidas: []
          };
        }
      })
    );

    return res.json({
      success: true,
      users: usersConEstadoCuotas
    });
  } catch (error) {
    next(error);
  }
};

// Cambiar estado activo/inactivo de un usuario (validado previamente por middleware)
const toggleEstadoUsuario = async (req, res, next) => {
  const user = req.targetUser;

  try {
    const nuevoEstado = !user.status;
    await user.update({ status: nuevoEstado });

    const { password: _, ...datosUsuario } = user.toJSON();

    return res.json({
      success: true,
      message: `Usuario ${nuevoEstado ? 'activado' : 'pausado'} exitosamente`,
      user: datosUsuario
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerEstadisticas,
  obtenerUsuarios,
  toggleEstadoUsuario
};
