const Activity = require('../models/activity.model');
const Shift = require('../models/shift.model');
const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const Reservation = require('../models/reservation.model');

// Obtener todas las actividades
const obtenerActividades = async (req, res, next) => {
  try {
    const { soloActivas, branch_id } = req.query;
    const whereClause = {};
    if (soloActivas === 'true') whereClause.status = true;
    if (branch_id) whereClause.branch_id = branch_id;

    const activities = await Activity.findAll({
      where: whereClause,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'city']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'name', 'lastname', 'specialty', 'email']
        },
        {
          model: Shift,
          as: 'shifts',
          include: [
            { model: Teacher, as: 'teacher', attributes: ['id', 'name', 'lastname'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'city'] }
          ]
        }
      ],
      order: [['id', 'ASC']]
    });

    return res.json({
      success: true,
      activities
    });
  } catch (error) {
    next(error);
  }
};

// Obtener actividad por ID (validada y provista por middleware)
const obtenerActividadPorId = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      activity: req.activity
    });
  } catch (error) {
    next(error);
  }
};

// Crear nueva actividad (datos y reglas de negocio validados previamente por middleware)
const crearActividad = async (req, res, next) => {
  const { name, duration, capacity, description, dayOfWeek, startTime, endTime } = req.body;
  const targetSedeId = req.targetSedeId;
  const targetProfesorId = req.targetProfesorId;

  try {
    const nuevaActividad = await Activity.create({
      name: name.trim(),
      duration: parseInt(duration, 10),
      capacity: parseInt(capacity, 10),
      description: description ? description.trim() : null,
      branch_id: targetSedeId,
      teacher_id: targetProfesorId,
      status: true
    });

    // Crear el turno asociado a la actividad
    await Shift.create({
      activity_id: nuevaActividad.id,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      dayOfWeek: dayOfWeek.trim(),
      teacher_id: targetProfesorId,
      branch_id: targetSedeId,
      status: true
    });

    const activityCompleta = await Activity.findByPk(nuevaActividad.id, {
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'city']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'name', 'lastname', 'specialty', 'email']
        },
        {
          model: Shift,
          as: 'shifts'
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Actividad y horario de dictado creados exitosamente',
      activity: activityCompleta
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar actividad (validada previamente por middleware)
const actualizarActividad = async (req, res, next) => {
  const { name, duration, capacity, description, status, dayOfWeek, startTime, endTime } = req.body;
  const activity = req.activity;
  const parsedSedeId = req.parsedSedeId;
  const parsedProfesorId = req.parsedProfesorId;

  try {
    await activity.update({
      name: name !== undefined ? name.trim() : activity.name,
      duration: duration !== undefined ? parseInt(duration, 10) : activity.duration,
      capacity: capacity !== undefined ? parseInt(capacity, 10) : activity.capacity,
      description: description !== undefined ? description : activity.description,
      status: status !== undefined ? status : activity.status,
      branch_id: parsedSedeId,
      teacher_id: parsedProfesorId
    });

    // Actualizar o crear turno si se especificaron días u horarios
    if (dayOfWeek !== undefined || startTime !== undefined || endTime !== undefined || parsedSedeId !== undefined || parsedProfesorId !== undefined) {
      if (activity.shifts && activity.shifts.length > 0) {
        for (const t of activity.shifts) {
          await t.update({
            dayOfWeek: dayOfWeek !== undefined ? dayOfWeek.trim() : t.dayOfWeek,
            startTime: startTime !== undefined ? startTime.trim() : t.startTime,
            endTime: endTime !== undefined ? endTime.trim() : t.endTime,
            branch_id: parsedSedeId,
            teacher_id: parsedProfesorId
          });
        }
      } else if (startTime && endTime && dayOfWeek) {
        await Shift.create({
          activity_id: activity.id,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          dayOfWeek: dayOfWeek.trim(),
          teacher_id: parsedProfesorId,
          branch_id: parsedSedeId,
          status: true
        });
      }
    }

    const activityActualizada = await Activity.findByPk(activity.id, {
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'city']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'name', 'lastname', 'specialty', 'email']
        },
        {
          model: Shift,
          as: 'shifts'
        }
      ]
    });

    return res.json({
      success: true,
      message: 'Actividad actualizada exitosamente',
      activity: activityActualizada
    });
  } catch (error) {
    next(error);
  }
};

// Toggle de estado de la actividad (validado por middleware)
const toggleEstadoActividad = async (req, res, next) => {
  const activity = req.activity;

  try {
    const nuevoEstado = !activity.status;
    await activity.update({ status: nuevoEstado });

    return res.json({
      success: true,
      message: `Actividad ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      activity
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar actividad (validada por middleware)
const eliminarActividad = async (req, res, next) => {
  const activity = req.activity;

  try {
    // Eliminar turnos y reservas asociadas antes de eliminar la actividad
    const turnos = await Shift.findAll({ where: { activity_id: activity.id } });
    const turnoIds = turnos.map((t) => t.id);
    if (turnoIds.length > 0) {
      await Reservation.destroy({ where: { shift_id: turnoIds } });
      await Shift.destroy({ where: { id: turnoIds } });
    }

    await activity.destroy();

    return res.json({
      success: true,
      message: 'Actividad eliminada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerActividades,
  obtenerActividadPorId,
  crearActividad,
  actualizarActividad,
  toggleEstadoActividad,
  eliminarActividad
};
