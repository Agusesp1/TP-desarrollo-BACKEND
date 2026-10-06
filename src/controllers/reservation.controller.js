const Reservation = require('../models/reservation.model');
const Shift = require('../models/shift.model');
const Activity = require('../models/activity.model');
const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const User = require('../models/user.model');

// Helper para validate si un shift aplica a un día de la semana específico
const shiftAplicaEnDia = (daySemanaStr, dateStr) => {
  if (!daySemanaStr) return true;
  // Parsear date 'YYYY-MM-DD' en tiempo local evitando desfasajes UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayIndex = dateObj.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  const str = daySemanaStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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

  for (const [name, idx] of Object.entries(diasMap)) {
    if (str.includes(name) && dayIndex === idx) {
      return true;
    }
  }

  return false;
};

// Obtener date local en formato YYYY-MM-DD
const getFechaHoyLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Crear nueva reservation (Solo para el día de hoy)
const crearReserva = async (req, res) => {
  try {
    const { user_id, shift_id, date } = req.body;

    if (!user_id || !shift_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'user_id, shift_id y date son obligatorios'
      });
    }

    const dateHoy = getFechaHoyLocal();

    // Regla estricta del negocio: Solo shifts del mismo día
    if (date !== dateHoy) {
      return res.status(400).json({
        success: false,
        message: 'Solo se permite reservar shifts para el día de hoy.'
      });
    }

    // Verificar user
    const user = await User.findByPk(user_id);
    if (!user || !user.status) {
      return res.status(404).json({
        success: false,
        message: 'User no encontrado o inactivo.'
      });
    }

    // Verificar shift y activity
    const shift = await Shift.findByPk(shift_id, {
      include: [
        { model: Activity, as: 'activity' },
        { model: Teacher, as: 'teacher' },
        { model: Branch, as: 'branch' }
      ]
    });

    if (!shift || !shift.status) {
      return res.status(404).json({
        success: false,
        message: 'El shift seleccionado no existe o no se encuentra active.'
      });
    }

    // Verificar si el shift aplica al día de hoy
    if (!shiftAplicaEnDia(shift.dayOfWeek, date)) {
      return res.status(400).json({
        success: false,
        message: `Este shift (${shift.dayOfWeek}) no se dicta en el día de hoy.`
      });
    }

    // Verificar si el user ya reservó este shift para esta date
    const reservationExistente = await Reservation.findOne({
      where: {
        user_id,
        shift_id,
        date,
        status: 'confirmada'
      }
    });

    if (reservationExistente) {
      return res.status(400).json({
        success: false,
        message: 'Ya posees una reservation confirmada para este shift en el día de hoy.'
      });
    }

    // Verificar capacity disponible real
    const capacityMaximo = shift.activity?.capacity || 20;
    const reservationsActuales = await Reservation.count({
      where: {
        shift_id,
        date,
        status: 'confirmada'
      }
    });

    if (reservationsActuales >= capacityMaximo) {
      return res.status(400).json({
        success: false,
        message: `No hay cupos disponibles. El capacity máximo de ${capacityMaximo} personas está completo.`
      });
    }

    // Crear la reservation
    const nuevaReserva = await Reservation.create({
      user_id,
      shift_id,
      date,
      status: 'confirmada'
    });

    const reservationConDetalles = await Reservation.findByPk(nuevaReserva.id, {
      include: [
        {
          model: Shift,
          as: 'shift',
          include: [
            { model: Activity, as: 'activity' },
            { model: Teacher, as: 'teacher' },
            { model: Branch, as: 'branch' }
          ]
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'lastname', 'email']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: `¡Reservation confirmada con éxito para ${shift.activity?.name || 'la clase'}!`,
      reservation: reservationConDetalles,
      cuposRestantes: capacityMaximo - (reservationsActuales + 1)
    });
  } catch (error) {
    console.error('Error al crear reservation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al procesar la reservation',
      detalles: error.message
    });
  }
};

// Obtener reservations de un user
const obtenerReservasUsuario = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { date } = req.query;

    const whereClause = {
      user_id,
      status: 'confirmada'
    };

    if (date) {
      whereClause.date = date;
    }

    const reservations = await Reservation.findAll({
      where: whereClause,
      include: [
        {
          model: Shift,
          as: 'shift',
          include: [
            { model: Activity, as: 'activity' },
            { model: Teacher, as: 'teacher' },
            { model: Branch, as: 'branch' }
          ]
        }
      ],
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    return res.json({
      success: true,
      reservations
    });
  } catch (error) {
    console.error('Error al obtener reservations del user:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las reservations',
      detalles: error.message
    });
  }
};

// Cancelar una reservation
const cancelarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.body?.user_id || req.query?.user_id;

    const reservation = await Reservation.findByPk(id, {
      include: [
        {
          model: Shift,
          as: 'shift',
          include: [{ model: Activity, as: 'activity' }]
        }
      ]
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation no encontrada'
      });
    }

    // Si se pasa user_id, validate que le pertenezca
    if (user_id && reservation.user_id.toString() !== user_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar esta reservation'
      });
    }

    const nameClase = reservation.shift?.activity?.name || 'Clase';
    await reservation.destroy();

    return res.json({
      success: true,
      message: `Reservation de ${nameClase} cancelada exitosamente. Tu lugar ha sido liberado.`
    });
  } catch (error) {
    console.error('Error al cancelar reservation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al cancelar la reservation',
      detalles: error.message
    });
  }
};

module.exports = {
  crearReserva,
  obtenerReservasUsuario,
  cancelarReserva,
  shiftAplicaEnDia,
  getFechaHoyLocal
};
