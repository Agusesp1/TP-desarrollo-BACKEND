const Activity = require('../models/activity.model');
const Shift = require('../models/shift.model');
const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');

// Obtener todas las activities
const obtenerActividades = async (req, res) => {
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
    console.error('Error al obtener activities:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener activities',
      detalles: error.message
    });
  }
};

// Obtener activity por ID
const obtenerActividadPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const activity = await Activity.findByPk(id, {
      include: [
        {
          model: Branch,
          as: 'branch'
        },
        {
          model: Teacher,
          as: 'teacher'
        },
        {
          model: Shift,
          as: 'shifts',
          include: [
            { model: Teacher, as: 'teacher' },
            { model: Branch, as: 'branch' }
          ]
        }
      ]
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity no encontrada'
      });
    }

    return res.json({
      success: true,
      activity
    });
  } catch (error) {
    console.error('Error al obtener activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener la activity',
      detalles: error.message
    });
  }
};

// Crear nueva activity
const crearActividad = async (req, res) => {
  const { name, duration, capacity, description, branch_id, teacher_id, dayOfWeek, startTime, endTime } = req.body;

  if (!name || !duration || !capacity || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: 'El name, la duración, el capacity, los días de dictado y el schedule son campos obligatorios'
    });
  }

  try {
    const targetSedeId = branch_id ? parseInt(branch_id, 10) : null;
    const targetProfesorId = teacher_id ? parseInt(teacher_id, 10) : null;

    if (targetProfesorId && targetSedeId) {
      const teacher = await Teacher.findByPk(targetProfesorId);
      if (teacher && teacher.branch_id && parseInt(teacher.branch_id, 10) !== targetSedeId) {
        const [branchProf, branchAct] = await Promise.all([
          Branch.findByPk(teacher.branch_id),
          Branch.findByPk(targetSedeId)
        ]);
        const nomSedeProf = branchProf ? branchProf.name : `Branch #${teacher.branch_id}`;
        const nomSedeAct = branchAct ? branchAct.name : `Branch #${targetSedeId}`;
        return res.status(400).json({
          success: false,
          message: `El teacher ${teacher.name} ${teacher.lastname} está asignado a ${nomSedeProf} y no puede dictar activities en ${nomSedeAct}`
        });
      }
    }

    const nuevaActividad = await Activity.create({
      name: name.trim(),
      duration: parseInt(duration, 10),
      capacity: parseInt(capacity, 10),
      description: description ? description.trim() : null,
      branch_id: targetSedeId,
      teacher_id: targetProfesorId,
      status: true
    });

    // Crear el shift u schedule de dictado asociado a la activity
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
      message: 'Activity y schedule de dictado creados exitosamente',
      activity: activityCompleta
    });
  } catch (error) {
    console.error('Error al crear activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear la activity',
      detalles: error.message
    });
  }
};

// Actualizar activity
const actualizarActividad = async (req, res) => {
  const { id } = req.params;
  const { name, duration, capacity, description, status, branch_id, teacher_id, dayOfWeek, startTime, endTime } = req.body;

  try {
    const activity = await Activity.findByPk(id, {
      include: [{ model: Shift, as: 'shifts' }]
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity no encontrada'
      });
    }

    const parsedSedeId = branch_id !== undefined ? (branch_id ? parseInt(branch_id, 10) : null) : activity.branch_id;
    const parsedProfesorId = teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id, 10) : null) : activity.teacher_id;

    if (parsedProfesorId && parsedSedeId) {
      const teacher = await Teacher.findByPk(parsedProfesorId);
      if (teacher && teacher.branch_id && parseInt(teacher.branch_id, 10) !== parsedSedeId) {
        const [branchProf, branchAct] = await Promise.all([
          Branch.findByPk(teacher.branch_id),
          Branch.findByPk(parsedSedeId)
        ]);
        const nomSedeProf = branchProf ? branchProf.name : `Branch #${teacher.branch_id}`;
        const nomSedeAct = branchAct ? branchAct.name : `Branch #${parsedSedeId}`;
        return res.status(400).json({
          success: false,
          message: `El teacher ${teacher.name} ${teacher.lastname} está asignado a ${nomSedeProf} y no puede dictar activities en ${nomSedeAct}`
        });
      }
    }

    await activity.update({
      name: name !== undefined ? name.trim() : activity.name,
      duration: duration !== undefined ? parseInt(duration, 10) : activity.duration,
      capacity: capacity !== undefined ? parseInt(capacity, 10) : activity.capacity,
      description: description !== undefined ? description : activity.description,
      status: status !== undefined ? status : activity.status,
      branch_id: parsedSedeId,
      teacher_id: parsedProfesorId
    });

    // Actualizar o crear shift si se especificaron días u schedules
    if (dayOfWeek !== undefined || startTime !== undefined || endTime !== undefined || branch_id !== undefined || teacher_id !== undefined) {
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
      message: 'Activity actualizada exitosamente',
      activity: activityActualizada
    });
  } catch (error) {
    console.error('Error al actualizar activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al actualizar la activity',
      detalles: error.message
    });
  }
};

// Toggle status de la activity
const toggleEstadoActividad = async (req, res) => {
  const { id } = req.params;
  try {
    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity no encontrada'
      });
    }

    const nuevoEstado = !activity.status;
    await activity.update({ status: nuevoEstado });

    return res.json({
      success: true,
      message: `Activity ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      activity
    });
  } catch (error) {
    console.error('Error al cambiar status de la activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar status de la activity',
      detalles: error.message
    });
  }
};

// Eliminar activity
const eliminarActividad = async (req, res) => {
  const { id } = req.params;
  try {
    const activity = await Activity.findByPk(id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity no encontrada'
      });
    }

    await activity.destroy();

    return res.json({
      success: true,
      message: 'Activity eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar activity',
      detalles: error.message
    });
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
