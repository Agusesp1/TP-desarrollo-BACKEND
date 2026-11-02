const Shift = require('../models/shift.model');
const Activity = require('../models/activity.model');
const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const Reservation = require('../models/reservation.model');

// Obtener todos los turnos con información real de cupos y reservas
const obtenerTurnos = async (req, res, next) => {
  try {
    const { activity_id, branch_id, dayOfWeek, soloActivos, date, user_id, page, limit } = req.query;
    const whereClause = {};

    if (activity_id) whereClause.activity_id = activity_id;
    if (branch_id) whereClause.branch_id = branch_id;
    if (dayOfWeek) whereClause.dayOfWeek = dayOfWeek;
    if (soloActivos === 'true') whereClause.status = true;

    const d = new Date();
    const dateConsulta = date || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let shifts = [];
    let totalCount = 0;
    let pageNum = page ? parseInt(page, 10) : null;
    let limitNum = limit ? parseInt(limit, 10) : 10;

    const includeConfig = [
      {
        model: Activity,
        as: 'activity',
        attributes: ['id', 'name', 'duration', 'capacity', 'description']
      },
      {
        model: Teacher,
        as: 'teacher',
        attributes: ['id', 'name', 'lastname', 'specialty', 'branch_id']
      },
      {
        model: Branch,
        as: 'branch',
        attributes: ['id', 'name', 'city', 'address']
      },
      {
        model: Reservation,
        as: 'reservations',
        where: { date: dateConsulta, status: 'confirmada' },
        required: false,
        attributes: ['id', 'user_id', 'date', 'status']
      }
    ];

    if (pageNum && pageNum > 0) {
      const offset = (pageNum - 1) * limitNum;
      const result = await Shift.findAndCountAll({
        where: whereClause,
        include: includeConfig,
        order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']],
        offset,
        limit: limitNum,
        distinct: true
      });
      shifts = result.rows;
      totalCount = result.count;
    } else {
      shifts = await Shift.findAll({
        where: whereClause,
        include: includeConfig,
        order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
      });
      totalCount = shifts.length;
      pageNum = 1;
      limitNum = shifts.length || 10;
    }

    const shiftsFormateados = shifts.map((t) => {
      const shiftJson = t.toJSON();
      const reservations = shiftJson.reservations || [];
      const cupos_ocupados = reservations.length;
      const capacity_maximo = shiftJson.activity?.capacity || 20;
      const cupos_disponibles = Math.max(0, capacity_maximo - cupos_ocupados);
      const miReserva = user_id ? reservations.find((r) => r.user_id.toString() === user_id.toString()) : null;

      return {
        ...shiftJson,
        date_consultada: dateConsulta,
        cupos_ocupados,
        capacity_maximo,
        cupos_disponibles,
        esta_lleno: cupos_disponibles <= 0,
        reservado_por_mi: !!miReserva,
        mi_reservation_id: miReserva ? miReserva.id : null
      };
    });

    return res.json({
      success: true,
      date: dateConsulta,
      shifts: shiftsFormateados,
      paginacion: {
        total: totalCount,
        paginaActual: pageNum,
        totalPaginas: Math.ceil(totalCount / (limitNum || 1)) || 1,
        limite: limitNum
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtener turno por ID (validado y provisto por middleware)
const obtenerTurnoPorId = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      shift: req.shift
    });
  } catch (error) {
    next(error);
  }
};

// Crear nuevo turno (validado previamente por middleware)
const crearTurno = async (req, res, next) => {
  const { startTime, endTime, dayOfWeek } = req.body;
  const actIdNum = req.actIdNum;
  const effectiveSedeId = req.effectiveSedeId;
  const targetProfesorId = req.targetProfesorId;

  try {
    const nuevoTurno = await Shift.create({
      activity_id: actIdNum,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      dayOfWeek: dayOfWeek || 'Lunes',
      teacher_id: targetProfesorId,
      branch_id: effectiveSedeId,
      status: true
    });

    const shiftConRelaciones = await Shift.findByPk(nuevoTurno.id, {
      include: [
        { model: Activity, as: 'activity' },
        { model: Teacher, as: 'teacher' },
        { model: Branch, as: 'branch' }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Turno creado exitosamente',
      shift: shiftConRelaciones || nuevoTurno
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar turno (validado previamente por middleware)
const actualizarTurno = async (req, res, next) => {
  const shift = req.shift;
  const { startTime, endTime, dayOfWeek, status } = req.body;
  const targetActividadId = req.targetActividadId;
  const effectiveSedeId = req.effectiveSedeId;
  const targetProfesorId = req.targetProfesorId;

  try {
    await shift.update({
      activity_id: targetActividadId,
      startTime: startTime !== undefined ? startTime.trim() : shift.startTime,
      endTime: endTime !== undefined ? endTime.trim() : shift.endTime,
      dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : shift.dayOfWeek,
      teacher_id: targetProfesorId,
      branch_id: effectiveSedeId,
      status: status !== undefined ? status : shift.status
    });

    const shiftActualizado = await Shift.findByPk(shift.id, {
      include: [
        { model: Activity, as: 'activity' },
        { model: Teacher, as: 'teacher' },
        { model: Branch, as: 'branch' }
      ]
    });

    return res.json({
      success: true,
      message: 'Turno actualizado exitosamente',
      shift: shiftActualizado
    });
  } catch (error) {
    next(error);
  }
};

// Toggle de estado del turno (validado por middleware)
const toggleEstadoTurno = async (req, res, next) => {
  const shift = req.shift;

  try {
    const nuevoEstado = !shift.status;
    await shift.update({ status: nuevoEstado });

    return res.json({
      success: true,
      message: `Turno ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      shift
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar turno (validado por middleware)
const eliminarTurno = async (req, res, next) => {
  const shift = req.shift;

  try {
    // Eliminar reservas asociadas previamente para mantener integridad
    await Reservation.destroy({ where: { shift_id: shift.id } });
    await shift.destroy();

    return res.json({
      success: true,
      message: 'Turno eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTurnos,
  obtenerTurnoPorId,
  crearTurno,
  actualizarTurno,
  toggleEstadoTurno,
  eliminarTurno
};
