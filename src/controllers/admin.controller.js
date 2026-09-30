const Usuario = require('../models/usuario.model');
const Sede = require('../models/sede.model');
const Profesor = require('../models/profesor.model');
const Actividad = require('../models/actividad.model');
const Turno = require('../models/turno.model');
const cuotaService = require('../services/cuota.service');

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

// Obtener listado de clientes/socios y usuarios en general con información de cuotas
const obtenerUsuarios = async (req, res) => {
  try {
    // Sincronizar estados de las cuotas antes de evaluar cobranza
    await cuotaService.actualizarEstadosCuotas();

    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['password'] },
      order: [['id', 'DESC']]
    });

    const usuariosConEstadoCuotas = await Promise.all(
      usuarios.map(async (usuario) => {
        const jsonUser = usuario.toJSON();

        if (usuario.rol === 'usuario') {
          // Evaluar cobranza de usuario/cliente
          const cobranza = await cuotaService.obtenerEstadoCobranzaUsuario(usuario.id);

          // Si tiene cuotas 'no pagado', sincronizar o reflejar si está activo o desactivado por falta de pago
          let estadoActual = usuario.estado;
          if (cobranza.estadoCuota === 'Con Deuda') {
            if (usuario.estado) {
              await usuario.update({ estado: false });
              estadoActual = false;
            }
          }

          return {
            ...jsonUser,
            estado: estadoActual,
            estadoCuota: cobranza.estadoCuota,
            demorado: cobranza.demorado,
            alDia: cobranza.alDia,
            cantCuotasVencidas: cobranza.cantVencidas,
            cuotasVencidas: cobranza.cuotasVencidas
          };
        } else {
          // Administradores y profesores no poseen cuotas
          return {
            ...jsonUser,
            estadoCuota: 'N/A',
            demorado: false,
            alDia: true,
            cantCuotasVencidas: 0,
            cuotasVencidas: []
          };
        }
      })
    );

    return res.json({
      exito: true,
      usuarios: usuariosConEstadoCuotas
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener usuarios',
      detalles: error.message
    });
  }
};

// Cambiar estado activo/inactivo de un usuario
const toggleEstadoUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    const nuevoEstado = !usuario.estado;
    await usuario.update({ estado: nuevoEstado });

    const { password: _, ...datosUsuario } = usuario.toJSON();

    return res.json({
      exito: true,
      mensaje: `Usuario ${nuevoEstado ? 'activado' : 'pausado'} exitosamente`,
      usuario: datosUsuario
    });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al cambiar estado del usuario',
      detalles: error.message
    });
  }
};

module.exports = {
  obtenerEstadisticas,
  obtenerUsuarios,
  toggleEstadoUsuario
};
