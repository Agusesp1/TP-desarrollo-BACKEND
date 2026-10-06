const User = require('../models/user.model');
const Branch = require('../models/branch.model');
const Teacher = require('../models/teacher.model');
const Activity = require('../models/activity.model');
const Shift = require('../models/shift.model');
const quotaService = require('../services/quota.service');

// Obtener estadísticas generales para el panel de administración
const obtenerEstadisticas = async (req, res) => {
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
    console.error('Error al obtener estadísticas del panel admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      detalles: error.message
    });
  }
};

// Obtener listado de clients/members y users en general con información de quotas
const obtenerUsuarios = async (req, res) => {
  try {
    // Sincronizar estados de las quotas antes de evaluar cobranza
    await quotaService.updateQuotasStatuses();

    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['id', 'DESC']]
    });

    const usersConEstadoCuotas = await Promise.all(
      users.map(async (user) => {
        const jsonUser = user.toJSON();

        if (user.role === 'user') {
          // Evaluar cobranza de user/cliente
          const cobranza = await quotaService.obtenerEstadoCobranzaUsuario(user.id);

          // Si tiene quotas 'no pagado', sincronizar o reflejar si está active o desactivado por falta de payment
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
            cantCuotasVencidas: cobranza.cantVencidas,
            quotasVencidas: cobranza.quotasVencidas
          };
        } else {
          // Administradores y teachers no poseen quotas
          return {
            ...jsonUser,
            statusCuota: 'N/A',
            demorado: false,
            alDia: true,
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
    console.error('Error al obtener users:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener users',
      detalles: error.message
    });
  }
};

// Cambiar status active/inactivo de un user
const toggleEstadoUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User no encontrado'
      });
    }

    const nuevoEstado = !user.status;
    await user.update({ status: nuevoEstado });

    const { password: _, ...datosUsuario } = user.toJSON();

    return res.json({
      success: true,
      message: `User ${nuevoEstado ? 'activado' : 'pausado'} exitosamente`,
      user: datosUsuario
    });
  } catch (error) {
    console.error('Error al cambiar status del user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar status del user',
      detalles: error.message
    });
  }
};

module.exports = {
  obtenerEstadisticas,
  obtenerUsuarios,
  toggleEstadoUsuario
};
