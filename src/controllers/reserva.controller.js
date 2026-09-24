const Reserva = require('../models/reserva.model');
const Turno = require('../models/turno.model');
const Actividad = require('../models/actividad.model');
const Profesor = require('../models/profesor.model');
const Sede = require('../models/sede.model');
const Usuario = require('../models/usuario.model');

// Helper para validar si un turno aplica a un día de la semana específico
const turnoAplicaEnDia = (diaSemanaStr, dateStr) => {
  if (!diaSemanaStr) return true;
  // Parsear fecha 'YYYY-MM-DD' en tiempo local evitando desfasajes UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayIndex = dateObj.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  const str = diaSemanaStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (str.includes('todos')) return true;
  if (str.includes('lunes a sabado')) return dayIndex >= 1 && dayIndex <= 6;
  if (str.includes('lunes a viernes')) return dayIndex >= 1 && dayIndex <= 5;
  if (str.includes('lunes, miercoles y viernes') || (str.includes('lunes') && str.includes('miercoles') && str.includes('viernes'))) {
    return dayIndex === 1 || dayIndex === 3 || dayIndex === 5;
  }
  if (str.includes('martes y jueves') || (str.includes('martes') && str.includes('jueves'))) {
    return dayIndex === 2 || dayIndex === 4;
  }

  const diasMap = {
    domingo: 0,
    domingos: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sabados: 6
  };

  for (const [nombre, idx] of Object.entries(diasMap)) {
    if (str.includes(nombre) && dayIndex === idx) {
      return true;
    }
  }

  return false;
};

// Obtener fecha local en formato YYYY-MM-DD
const getFechaHoyLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Crear nueva reserva (Solo para el día de hoy)
const crearReserva = async (req, res) => {
  try {
    const { usuario_id, turno_id, fecha } = req.body;

    if (!usuario_id || !turno_id || !fecha) {
      return res.status(400).json({
        exito: false,
        mensaje: 'usuario_id, turno_id y fecha son obligatorios'
      });
    }

    const fechaHoy = getFechaHoyLocal();

    // Regla estricta del negocio: Solo turnos del mismo día
    if (fecha !== fechaHoy) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Solo se permite reservar turnos para el día de hoy.'
      });
    }

    // Verificar usuario
    const usuario = await Usuario.findByPk(usuario_id);
    if (!usuario || !usuario.estado) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado o inactivo.'
      });
    }

    // Verificar turno y actividad
    const turno = await Turno.findByPk(turno_id, {
      include: [
        { model: Actividad, as: 'actividad' },
        { model: Profesor, as: 'profesor' },
        { model: Sede, as: 'sede' }
      ]
    });

    if (!turno || !turno.estado) {
      return res.status(404).json({
        exito: false,
        mensaje: 'El turno seleccionado no existe o no se encuentra activo.'
      });
    }

    // Verificar si el turno aplica al día de hoy
    if (!turnoAplicaEnDia(turno.dia_semana, fecha)) {
      return res.status(400).json({
        exito: false,
        mensaje: `Este turno (${turno.dia_semana}) no se dicta en el día de hoy.`
      });
    }

    // Verificar si el usuario ya reservó este turno para esta fecha
    const reservaExistente = await Reserva.findOne({
      where: {
        usuario_id,
        turno_id,
        fecha,
        estado: 'confirmada'
      }
    });

    if (reservaExistente) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Ya posees una reserva confirmada para este turno en el día de hoy.'
      });
    }

    // Verificar cupo disponible real
    const cupoMaximo = turno.actividad?.cupo || 20;
    const reservasActuales = await Reserva.count({
      where: {
        turno_id,
        fecha,
        estado: 'confirmada'
      }
    });

    if (reservasActuales >= cupoMaximo) {
      return res.status(400).json({
        exito: false,
        mensaje: `No hay cupos disponibles. El cupo máximo de ${cupoMaximo} personas está completo.`
      });
    }

    // Crear la reserva
    const nuevaReserva = await Reserva.create({
      usuario_id,
      turno_id,
      fecha,
      estado: 'confirmada'
    });

    const reservaConDetalles = await Reserva.findByPk(nuevaReserva.id, {
      include: [
        {
          model: Turno,
          as: 'turno',
          include: [
            { model: Actividad, as: 'actividad' },
            { model: Profesor, as: 'profesor' },
            { model: Sede, as: 'sede' }
          ]
        },
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email']
        }
      ]
    });

    return res.status(201).json({
      exito: true,
      mensaje: `¡Reserva confirmada con éxito para ${turno.actividad?.nombre || 'la clase'}!`,
      reserva: reservaConDetalles,
      cuposRestantes: cupoMaximo - (reservasActuales + 1)
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al procesar la reserva',
      detalles: error.message
    });
  }
};

// Obtener reservas de un usuario
const obtenerReservasUsuario = async (req, res) => {
  try {
    const { usuario_id } = req.params;
    const { fecha } = req.query;

    const whereClause = {
      usuario_id,
      estado: 'confirmada'
    };

    if (fecha) {
      whereClause.fecha = fecha;
    }

    const reservas = await Reserva.findAll({
      where: whereClause,
      include: [
        {
          model: Turno,
          as: 'turno',
          include: [
            { model: Actividad, as: 'actividad' },
            { model: Profesor, as: 'profesor' },
            { model: Sede, as: 'sede' }
          ]
        }
      ],
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    });

    return res.json({
      exito: true,
      reservas
    });
  } catch (error) {
    console.error('Error al obtener reservas del usuario:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener las reservas',
      detalles: error.message
    });
  }
};

// Cancelar una reserva
const cancelarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.body?.usuario_id || req.query?.usuario_id;

    const reserva = await Reserva.findByPk(id, {
      include: [
        {
          model: Turno,
          as: 'turno',
          include: [{ model: Actividad, as: 'actividad' }]
        }
      ]
    });

    if (!reserva) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Reserva no encontrada'
      });
    }

    // Si se pasa usuario_id, validar que le pertenezca
    if (usuario_id && reserva.usuario_id.toString() !== usuario_id.toString()) {
      return res.status(403).json({
        exito: false,
        mensaje: 'No tienes permiso para cancelar esta reserva'
      });
    }

    const nombreClase = reserva.turno?.actividad?.nombre || 'Clase';
    await reserva.destroy();

    return res.json({
      exito: true,
      mensaje: `Reserva de ${nombreClase} cancelada exitosamente. Tu lugar ha sido liberado.`
    });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al cancelar la reserva',
      detalles: error.message
    });
  }
};

module.exports = {
  crearReserva,
  obtenerReservasUsuario,
  cancelarReserva,
  turnoAplicaEnDia,
  getFechaHoyLocal
};
