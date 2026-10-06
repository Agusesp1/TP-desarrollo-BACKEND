const Shift = require('../models/shift.model');
const Activity = require('../models/activity.model');
const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const Reservation = require('../models/reservation.model');

// Obtener todos los shifts con información real de cupos y reservations
const obtenerTurnos = async (req, res) => {
  try {
    const { activity_id, branch_id, dayOfWeek, soloActivos, date, user_id, page, limit } = req.query;
    const whereClause = {};

    if (activity_id) whereClause.activity_id = activity_id;
    if (branch_id) whereClause.branch_id = branch_id;
    if (dayOfWeek) whereClause.dayOfWeek = dayOfWeek;
    if (soloActivos === 'true') whereClause.status = true;

    // Date a consultar (por defecto la date local del servidor)
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

    const shiftsFormateados = shifts.map(t => {
      const shiftJson = t.toJSON();
      const reservations = shiftJson.reservations || [];
      const cupos_ocupados = reservations.length;
      const capacity_maximo = shiftJson.activity?.capacity || 20;
      const cupos_disponibles = Math.max(0, capacity_maximo - cupos_ocupados);
      const miReserva = user_id ? reservations.find(r => r.user_id.toString() === user_id.toString()) : null;

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
    console.error('Error al obtener shifts:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener los shifts',
      detalles: error.message
    });
  }
};

// Obtener shift por ID
const obtenerTurnoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const shift = await Shift.findByPk(id, {
      include: [
        { model: Activity, as: 'activity' },
        { model: Teacher, as: 'teacher' },
        { model: Branch, as: 'branch' }
      ]
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift no encontrado'
      });
    }

    return res.json({
      success: true,
      shift
    });
  } catch (error) {
    console.error('Error al obtener shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener el shift',
      detalles: error.message
    });
  }
};

// Crear nuevo shift (dependiente de una activity)
const crearTurno = async (req, res) => {
  const { activity_id, startTime, endTime, dayOfWeek, teacher_id, branch_id } = req.body;

  if (!activity_id || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: 'La activity, el schedule de home y el schedule de fin son campos obligatorios'
    });
  }

  try {
    // Validate que la activity exista
    const activity = await Activity.findByPk(activity_id);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'La activity especificada no existe'
      });
    }

    // Determinar la branch efectiva (del shift o de la activity)
    const effectiveSedeId = branch_id ? parseInt(branch_id, 10) : (activity.branch_id ? parseInt(activity.branch_id, 10) : null);

    // Validate que el teacher asignado coincida con la branch de la activity/shift
    if (teacher_id) {
      const teacher = await Teacher.findByPk(teacher_id);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'El teacher especificado no existe'
        });
      }
      if (teacher.branch_id && effectiveSedeId && parseInt(teacher.branch_id, 10) !== parseInt(effectiveSedeId, 10)) {
        const [branchProf, branchTurno] = await Promise.all([
          Branch.findByPk(teacher.branch_id),
          Branch.findByPk(effectiveSedeId)
        ]);
        const nomSedeProf = branchProf ? branchProf.name : `Branch #${teacher.branch_id}`;
        const nomSedeTurno = branchTurno ? branchTurno.name : `Branch #${effectiveSedeId}`;
        return res.status(400).json({
          success: false,
          message: `El teacher ${teacher.name} ${teacher.lastname} está asignado a ${nomSedeProf} y no puede dictar clases en ${nomSedeTurno}`
        });
      }
    }

    const nuevoTurno = await Shift.create({
      activity_id: parseInt(activity_id, 10),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      dayOfWeek: dayOfWeek || 'Lunes',
      teacher_id: teacher_id ? parseInt(teacher_id, 10) : null,
      branch_id: effectiveSedeId,
      status: true
    });

    // Obtener shift con relaciones para retornar al frontend
    const shiftConRelaciones = await Shift.findByPk(nuevoTurno.id, {
      include: [
        { model: Activity, as: 'activity' },
        { model: Teacher, as: 'teacher' },
        { model: Branch, as: 'branch' }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Shift creado exitosamente',
      shift: shiftConRelaciones || nuevoTurno
    });
  } catch (error) {
    console.error('Error al crear shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear el shift',
      detalles: error.message
    });
  }
};

// Actualizar shift
const actualizarTurno = async (req, res) => {
  const { id } = req.params;
  const { activity_id, startTime, endTime, dayOfWeek, teacher_id, branch_id, status } = req.body;

  try {
    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift no encontrado'
      });
    }

    const targetActividadId = activity_id !== undefined ? parseInt(activity_id, 10) : shift.activity_id;
    let activityObj = null;
    if (targetActividadId) {
      activityObj = await Activity.findByPk(targetActividadId);
      if (!activityObj) {
        return res.status(404).json({
          success: false,
          message: 'La activity especificada no existe'
        });
      }
    }

    const targetSedeId = branch_id !== undefined ? (branch_id ? parseInt(branch_id, 10) : null) : shift.branch_id;
    const effectiveSedeId = targetSedeId || (activityObj?.branch_id ? parseInt(activityObj.branch_id, 10) : null);
    const targetProfesorId = teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id, 10) : null) : shift.teacher_id;

    // Validate coincidencia de branch del teacher
    if (targetProfesorId) {
      const teacher = await Teacher.findByPk(targetProfesorId);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'El teacher especificado no existe'
        });
      }
      if (teacher.branch_id && effectiveSedeId && parseInt(teacher.branch_id, 10) !== parseInt(effectiveSedeId, 10)) {
        const [branchProf, branchTurno] = await Promise.all([
          Branch.findByPk(teacher.branch_id),
          Branch.findByPk(effectiveSedeId)
        ]);
        const nomSedeProf = branchProf ? branchProf.name : `Branch #${teacher.branch_id}`;
        const nomSedeTurno = branchTurno ? branchTurno.name : `Branch #${effectiveSedeId}`;
        return res.status(400).json({
          success: false,
          message: `El teacher ${teacher.name} ${teacher.lastname} está asignado a ${nomSedeProf} y no puede dictar clases en ${nomSedeTurno}`
        });
      }
    }

    await shift.update({
      activity_id: targetActividadId,
      startTime: startTime !== undefined ? startTime.trim() : shift.startTime,
      endTime: endTime !== undefined ? endTime.trim() : shift.endTime,
      dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : shift.dayOfWeek,
      teacher_id: targetProfesorId,
      branch_id: effectiveSedeId,
      status: status !== undefined ? status : shift.status
    });

    const shiftActualizado = await Shift.findByPk(id, {
      include: [
        { model: Activity, as: 'activity' },
        { model: Teacher, as: 'teacher' },
        { model: Branch, as: 'branch' }
      ]
    });

    return res.json({
      success: true,
      message: 'Shift actualizado exitosamente',
      shift: shiftActualizado
    });
  } catch (error) {
    console.error('Error al actualizar shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al actualizar el shift',
      detalles: error.message
    });
  }
};

// Toggle status del shift
const toggleEstadoTurno = async (req, res) => {
  const { id } = req.params;
  try {
    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift no encontrado'
      });
    }

    const nuevoEstado = !shift.status;
    await shift.update({ status: nuevoEstado });

    return res.json({
      success: true,
      message: `Shift ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      shift
    });
  } catch (error) {
    console.error('Error al cambiar status del shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar status del shift',
      detalles: error.message
    });
  }
};

// Eliminar shift
const eliminarTurno = async (req, res) => {
  const { id } = req.params;
  try {
    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift no encontrado'
      });
    }

    await shift.destroy();

    return res.json({
      success: true,
      message: 'Shift eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar shift',
      detalles: error.message
    });
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
