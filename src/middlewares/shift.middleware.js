const Shift = require('../models/shift.model');
const Activity = require('../models/activity.model');
const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const { Op } = require('sequelize');

const formatoHoraRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const convertirHoraAMinutos = (horaStr) => {
  if (!horaStr || typeof horaStr !== 'string' || !formatoHoraRegex.test(horaStr.trim())) return null;
  const [h, m] = horaStr.trim().split(':').map(Number);
  return h * 60 + m;
};

// Validar parámetro ID y verificar existencia del turno en BD
const validateIdTurno = async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El identificador de turno proporcionado no es válido'
    });
  }

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
        message: 'Turno no encontrado'
      });
    }

    req.shift = shift;
    next();
  } catch (error) {
    next(error);
  }
};

// Validar creación de turno y verificar existencia de actividad y compatibilidad
const validateCrearTurno = async (req, res, next) => {
  const { activity_id, startTime, endTime, dayOfWeek, teacher_id, branch_id } = req.body;

  // 1. Campos obligatorios
  if (!activity_id || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: 'La actividad, el horario de inicio y el horario de fin son obligatorios'
    });
  }

  const actIdNum = parseInt(activity_id, 10);
  if (isNaN(actIdNum) || actIdNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El identificador de la actividad debe ser un número entero válido'
    });
  }

  if (!formatoHoraRegex.test(startTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El horario de inicio debe tener el formato HH:MM (ejemplo: 08:00)'
    });
  }

  if (!formatoHoraRegex.test(endTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El horario de fin debe tener el formato HH:MM (ejemplo: 10:00)'
    });
  }

  const homeMin = convertirHoraAMinutos(startTime);
  const finMin = convertirHoraAMinutos(endTime);
  if (finMin <= homeMin) {
    return res.status(400).json({
      success: false,
      message: 'El horario de fin debe ser posterior al horario de inicio'
    });
  }

  try {
    // 2. Verificar que la actividad exista en BD
    const activity = await Activity.findByPk(actIdNum);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'La actividad especificada no existe'
      });
    }

    // 3. Determinar sede efectiva
    const effectiveSedeId = branch_id ? parseInt(branch_id, 10) : (activity.branch_id ? parseInt(activity.branch_id, 10) : null);
    const targetProfesorId = teacher_id ? parseInt(teacher_id, 10) : null;

    // 4. Validar coincidencia de sede del profesor
    if (targetProfesorId) {
      const teacher = await Teacher.findByPk(targetProfesorId);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'El profesor especificado no existe'
        });
      }

      if (teacher.branch_id && effectiveSedeId && parseInt(teacher.branch_id, 10) !== parseInt(effectiveSedeId, 10)) {
        const [branchProf, branchTurno] = await Promise.all([
          Branch.findByPk(teacher.branch_id),
          Branch.findByPk(effectiveSedeId)
        ]);
        const nomSedeProf = branchProf ? branchProf.name : `Sede #${teacher.branch_id}`;
        const nomSedeTurno = branchTurno ? branchTurno.name : `Sede #${effectiveSedeId}`;
        return res.status(400).json({
          success: false,
          message: `El profesor ${teacher.name} ${teacher.lastname} está asignado a ${nomSedeProf} y no puede dictar clases en ${nomSedeTurno}`
        });
      }
    }

    req.activityObj = activity;
    req.actIdNum = actIdNum;
    req.effectiveSedeId = effectiveSedeId;
    req.targetProfesorId = targetProfesorId;

    next();
  } catch (error) {
    next(error);
  }
};

// Validar actualización de turno y verificar compatibilidad
const validateActualizarTurno = async (req, res, next) => {
  const { id } = req.params;
  const { activity_id, startTime, endTime, teacher_id, branch_id } = req.body;
  const shift = req.shift; // Obtenido en validateIdTurno

  if (startTime !== undefined && !formatoHoraRegex.test(startTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El horario de inicio debe tener el formato HH:MM (ejemplo: 08:00)'
    });
  }

  if (endTime !== undefined && !formatoHoraRegex.test(endTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El horario de fin debe tener el formato HH:MM (ejemplo: 10:00)'
    });
  }

  const horaInicioEval = startTime || shift.startTime;
  const horaFinEval = endTime || shift.endTime;
  const homeMin = convertirHoraAMinutos(horaInicioEval);
  const finMin = convertirHoraAMinutos(horaFinEval);

  if (finMin <= homeMin) {
    return res.status(400).json({
      success: false,
      message: 'El horario de fin debe ser posterior al horario de inicio'
    });
  }

  try {
    const targetActividadId = activity_id !== undefined ? parseInt(activity_id, 10) : shift.activity_id;
    let activityObj = null;
    if (targetActividadId) {
      activityObj = await Activity.findByPk(targetActividadId);
      if (!activityObj) {
        return res.status(404).json({
          success: false,
          message: 'La actividad especificada no existe'
        });
      }
    }

    const targetSedeId = branch_id !== undefined ? (branch_id ? parseInt(branch_id, 10) : null) : shift.branch_id;
    const effectiveSedeId = targetSedeId || (activityObj?.branch_id ? parseInt(activityObj.branch_id, 10) : null);
    const targetProfesorId = teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id, 10) : null) : shift.teacher_id;

    if (targetProfesorId) {
      const teacher = await Teacher.findByPk(targetProfesorId);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'El profesor especificado no existe'
        });
      }
      if (teacher.branch_id && effectiveSedeId && parseInt(teacher.branch_id, 10) !== parseInt(effectiveSedeId, 10)) {
        const [branchProf, branchTurno] = await Promise.all([
          Branch.findByPk(teacher.branch_id),
          Branch.findByPk(effectiveSedeId)
        ]);
        const nomSedeProf = branchProf ? branchProf.name : `Sede #${teacher.branch_id}`;
        const nomSedeTurno = branchTurno ? branchTurno.name : `Sede #${effectiveSedeId}`;
        return res.status(400).json({
          success: false,
          message: `El profesor ${teacher.name} ${teacher.lastname} está asignado a ${nomSedeProf} y no puede dictar clases en ${nomSedeTurno}`
        });
      }
    }

    req.targetActividadId = targetActividadId;
    req.effectiveSedeId = effectiveSedeId;
    req.targetProfesorId = targetProfesorId;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateIdTurno,
  validateCrearTurno,
  validateActualizarTurno
};
