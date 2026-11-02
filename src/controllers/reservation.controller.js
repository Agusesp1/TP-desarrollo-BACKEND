const Reservation = require('../models/reservation.model');
const Shift = require('../models/shift.model');
const Activity = require('../models/activity.model');
const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const User = require('../models/user.model');

// Crear nueva reserva (validada completamente en middleware)
const crearReserva = async (req, res, next) => {
  const { user_id, shift_id, date } = req.body;
  const shift = req.shift;

  try {
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
      message: `¡Reserva confirmada con éxito para ${shift.activity?.name || 'la clase'}!`,
      reservation: reservationConDetalles,
      cuposRestantes: req.cuposRestantes
    });
  } catch (error) {
    next(error);
  }
};

// Obtener reservas de un usuario
const obtenerReservasUsuario = async (req, res, next) => {
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
    next(error);
  }
};

// Cancelar una reserva (validada y autorizada previamente por middleware)
const cancelarReserva = async (req, res, next) => {
  const reservation = req.reservation;

  try {
    const nombreClase = reservation.shift?.activity?.name || 'Clase';
    await reservation.destroy();

    return res.json({
      success: true,
      message: `Reserva de ${nombreClase} cancelada exitosamente. Tu lugar ha sido liberado.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearReserva,
  obtenerReservasUsuario,
  cancelarReserva
};
