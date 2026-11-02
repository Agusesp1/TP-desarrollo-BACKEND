const Reservation = require('../models/reservation.model');
const Shift = require('../models/shift.model');
const Activity = require('../models/activity.model');
const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const User = require('../models/user.model');

// Helper para validar si un turno aplica a un día de la semana específico
const shiftAplicaEnDia = (daySemanaStr, dateStr) => {
  if (!daySemanaStr) return true;
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

// Obtener fecha local en formato YYYY-MM-DD
const getFechaHoyLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Validar y verificar todas las condiciones previas para reservar un turno
const validateCrearReserva = async (req, res, next) => {
  try {
    const { user_id, shift_id, date } = req.body;

    if (!user_id || !shift_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'El socio, el turno y la fecha son obligatorios'
      });
    }

    const dateHoy = getFechaHoyLocal();

    // Regla de negocio: Solo turnos del mismo día
    if (date !== dateHoy) {
      return res.status(400).json({
        success: false,
        message: 'Solo se permite reservar turnos para el día de hoy.'
      });
    }

    // 1. Verificar socio en BD
    const user = await User.findByPk(user_id);
    if (!user || !user.status) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo.'
      });
    }

    // 2. Verificar turno y actividad en BD
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
        message: 'El turno seleccionado no existe o no se encuentra activo.'
      });
    }

    // 3. Verificar si el turno aplica al día de hoy
    if (!shiftAplicaEnDia(shift.dayOfWeek, date)) {
      return res.status(400).json({
        success: false,
        message: `Este turno (${shift.dayOfWeek}) no se dicta en el día de hoy.`
      });
    }

    // 4. Verificar si el usuario ya reservó este turno para hoy
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
        message: 'Ya posees una reserva confirmada para este turno en el día de hoy.'
      });
    }

    // 5. Verificar capacidad disponible real
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
        message: `No hay cupos disponibles. La capacidad máxima de ${capacityMaximo} personas está completa.`
      });
    }

    req.targetUser = user;
    req.shift = shift;
    req.cuposRestantes = capacityMaximo - (reservationsActuales + 1);

    next();
  } catch (error) {
    next(error);
  }
};

// Validar y verificar cancelación de reserva
const validateCancelarReserva = async (req, res, next) => {
  const { id } = req.params;
  const user_id = req.body?.user_id || req.query?.user_id;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El identificador de la reserva no es válido'
    });
  }

  try {
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
        message: 'Reserva no encontrada'
      });
    }

    // Validar autorización del usuario sobre la reserva
    if (user_id && reservation.user_id.toString() !== user_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar esta reserva'
      });
    }

    req.reservation = reservation;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateCrearReserva,
  validateCancelarReserva,
  shiftAplicaEnDia,
  getFechaHoyLocal
};
