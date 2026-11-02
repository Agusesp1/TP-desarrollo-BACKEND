const Activity = require('../models/activity.model');
const Branch = require('../models/branch.model');
const Teacher = require('../models/teacher.model');
const Shift = require('../models/shift.model');
const { Op } = require('sequelize');

// Expresión regular para validar formato HH:MM (24 horas: 00:00 a 23:59)
const formatoHoraRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const convertirHoraAMinutos = (horaStr) => {
  if (!horaStr || typeof horaStr !== 'string' || !formatoHoraRegex.test(horaStr.trim())) return null;
  const [h, m] = horaStr.trim().split(':').map(Number);
  return h * 60 + m;
};

// Convierte descripción de días a un arreglo de números de día (1=Lun ... 6=Sáb, 0=Dom)
const obtenerDiasNumericos = (diaStr) => {
  if (!diaStr) return [1, 2, 3, 4, 5, 6];
  const s = diaStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (s.includes('lunes a sabado') || s.includes('todos')) return [1, 2, 3, 4, 5, 6];
  if (s.includes('lunes a viernes')) return [1, 2, 3, 4, 5];
  if (s.includes('lunes, miercoles y viernes') || (s.includes('lunes') && s.includes('miercoles') && s.includes('viernes'))) return [1, 3, 5];
  if (s.includes('martes y jueves') || (s.includes('martes') && s.includes('jueves'))) return [2, 4];
  if (s.includes('sabado')) return [6];
  if (s.includes('domingo')) return [0];
  if (s.includes('lunes')) return [1];
  if (s.includes('martes')) return [2];
  if (s.includes('miercoles')) return [3];
  if (s.includes('jueves')) return [4];
  if (s.includes('viernes')) return [5];

  return [1, 2, 3, 4, 5];
};

// Determina si dos cadenas de días comparten al menos un día en común
const diasSeSuperponen = (diasA, diasB) => {
  const setA = new Set(obtenerDiasNumericos(diasA));
  const arrB = obtenerDiasNumericos(diasB);
  return arrB.some((dia) => setA.has(dia));
};

// Determina si dos franjas horarias se superponen (en minutos)
const horariosSeSuperponen = (inicioA, finA, inicioB, finB) => {
  return inicioA < finB && finA > inicioB;
};

// Validar parámetro ID y verificar existencia de la actividad en BD
const validateIdActividad = async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El identificador de la actividad no es válido'
    });
  }

  try {
    const activity = await Activity.findByPk(id, {
      include: [
        { model: Branch, as: 'branch' },
        { model: Teacher, as: 'teacher' },
        { model: Shift, as: 'shifts' }
      ]
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'La actividad solicitada no existe'
      });
    }

    req.activity = activity;
    next();
  } catch (error) {
    next(error);
  }
};

// Validar creación de actividad, verificación de sede, profesor y control estricto de duplicados
const validateCrearActividad = async (req, res, next) => {
  const { name, duration, capacity, description, branch_id, teacher_id, dayOfWeek, startTime, endTime } = req.body;

  // 1. Campos obligatorios
  if (!name || duration === undefined || duration === null || capacity === undefined || capacity === null || !dayOfWeek || !startTime || !endTime || !branch_id) {
    return res.status(400).json({
      success: false,
      message: 'El nombre, la duración, la capacidad, la sede, los días de dictado y el horario son obligatorios'
    });
  }

  const branchIdNum = parseInt(branch_id, 10);
  if (isNaN(branchIdNum) || branchIdNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Debe seleccionar una sede válida para la actividad'
    });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El nombre de la actividad no puede estar vacío'
    });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El nombre de la actividad no puede superar los 100 caracteres'
    });
  }

  const durationNum = parseInt(duration, 10);
  if (isNaN(durationNum) || durationNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'La duración debe ser un número entero mayor a 0 (minutos)'
    });
  }

  const capacityNum = parseInt(capacity, 10);
  if (isNaN(capacityNum) || capacityNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'La capacidad debe ser un número entero mayor a 0'
    });
  }

  if (typeof startTime !== 'string' || !formatoHoraRegex.test(startTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El horario de inicio debe tener formato HH:MM (entre 00:00 y 23:59)'
    });
  }

  if (typeof endTime !== 'string' || !formatoHoraRegex.test(endTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El horario de fin debe tener formato HH:MM (entre 00:00 y 23:59)'
    });
  }

  const inicioMin = convertirHoraAMinutos(startTime);
  const finMin = convertirHoraAMinutos(endTime);
  if (finMin <= inicioMin) {
    return res.status(400).json({
      success: false,
      message: `El horario de fin (${endTime}) debe ser posterior al horario de inicio (${startTime})`
    });
  }

  try {
    // 2. Verificar existencia de la sede en BD
    const branch = await Branch.findByPk(branchIdNum);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'La sede seleccionada no existe'
      });
    }

    const targetProfesorId = teacher_id ? parseInt(teacher_id, 10) : null;
    let teacher = null;

    if (targetProfesorId) {
      teacher = await Teacher.findByPk(targetProfesorId);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'El profesor especificado no existe'
        });
      }

      // Validar coincidencia de sede del profesor
      if (teacher.branch_id && parseInt(teacher.branch_id, 10) !== branchIdNum) {
        const branchProf = await Branch.findByPk(teacher.branch_id);
        const nomSedeProf = branchProf ? branchProf.name : `Sede #${teacher.branch_id}`;
        return res.status(400).json({
          success: false,
          message: `El profesor ${teacher.name} ${teacher.lastname} está asignado a ${nomSedeProf} y no puede dictar actividades en ${branch.name}`
        });
      }
    }

    // 3. Control de Duplicados:
    // Buscar actividades existentes para verificar coincidencia exacta o conflicto horario
    const actividadesExistentes = await Activity.findAll({
      where: {
        status: true
      },
      include: [
        { model: Shift, as: 'shifts', where: { status: true }, required: false },
        { model: Teacher, as: 'teacher' },
        { model: Branch, as: 'branch' }
      ]
    });

    const nombreNormalizado = name.trim().toLowerCase();

    for (const act of actividadesExistentes) {
      const turnos = act.shifts || [];

      for (const t of turnos) {
        const tInicio = convertirHoraAMinutos(t.startTime);
        const tFin = convertirHoraAMinutos(t.endTime);
        const coincideDias = diasSeSuperponen(dayOfWeek, t.dayOfWeek);
        const superponeHorario = tInicio !== null && tFin !== null && horariosSeSuperponen(inicioMin, finMin, tInicio, tFin);

        if (coincideDias && superponeHorario) {
          // Caso A: Misma actividad con mismo nombre, mismo profesor (o sin profesor) y mismo horario en la misma sede
          const mismoNombre = act.name.trim().toLowerCase() === nombreNormalizado;
          const mismaSede = act.branch_id === branchIdNum;
          const mismoProfesor = targetProfesorId ? act.teacher_id === targetProfesorId : (!act.teacher_id || act.teacher_id === targetProfesorId);

          if (mismoNombre && mismaSede && mismoProfesor) {
            const detalleProf = teacher ? ` con el profesor ${teacher.name} ${teacher.lastname}` : '';
            return res.status(409).json({
              success: false,
              message: `Ya existe la actividad '${act.name}'${detalleProf} en la sede ${branch.name} los días ${t.dayOfWeek} de ${t.startTime} a ${t.endTime} hs.`
            });
          }

          // Caso B: El profesor ya tiene otra actividad asignada en el mismo horario
          if (targetProfesorId && act.teacher_id === targetProfesorId) {
            return res.status(409).json({
              success: false,
              message: `El profesor ${teacher.name} ${teacher.lastname} ya dicta '${act.name}' los días ${t.dayOfWeek} de ${t.startTime} a ${t.endTime} hs. Elegí otro horario u otro profesor.`
            });
          }
        }
      }
    }

    req.targetSedeId = branchIdNum;
    req.targetProfesorId = targetProfesorId;
    next();
  } catch (error) {
    next(error);
  }
};

// Validar actualización de actividad y verificar compatibilidad y conflictos
const validateActualizarActividad = async (req, res, next) => {
  const { id } = req.params;
  const { name, duration, capacity, branch_id, teacher_id, dayOfWeek, startTime, endTime } = req.body;
  const activityActual = req.activity; // Obtenida en validateIdActividad

  if (duration !== undefined) {
    const durNum = parseInt(duration, 10);
    if (isNaN(durNum) || durNum <= 0) {
      return res.status(400).json({ success: false, message: 'La duración debe ser un número mayor a 0' });
    }
  }

  if (capacity !== undefined) {
    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      return res.status(400).json({ success: false, message: 'La capacidad debe ser un número mayor a 0' });
    }
  }

  if (startTime !== undefined && !formatoHoraRegex.test(startTime.trim())) {
    return res.status(400).json({ success: false, message: 'El horario de inicio debe tener formato HH:MM' });
  }

  if (endTime !== undefined && !formatoHoraRegex.test(endTime.trim())) {
    return res.status(400).json({ success: false, message: 'El horario de fin debe tener formato HH:MM' });
  }

  const horaInicioEval = startTime || activityActual.shifts?.[0]?.startTime || '08:00';
  const horaFinEval = endTime || activityActual.shifts?.[0]?.endTime || '09:00';
  const minIni = convertirHoraAMinutos(horaInicioEval);
  const minFin = convertirHoraAMinutos(horaFinEval);

  if (minFin <= minIni) {
    return res.status(400).json({
      success: false,
      message: `El horario de fin (${horaFinEval}) debe ser posterior al de inicio (${horaInicioEval})`
    });
  }

  try {
    const parsedSedeId = branch_id !== undefined ? (branch_id ? parseInt(branch_id, 10) : null) : activityActual.branch_id;
    const parsedProfesorId = teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id, 10) : null) : activityActual.teacher_id;

    if (parsedProfesorId && parsedSedeId) {
      const teacher = await Teacher.findByPk(parsedProfesorId);
      if (teacher && teacher.branch_id && parseInt(teacher.branch_id, 10) !== parsedSedeId) {
        const [branchProf, branchAct] = await Promise.all([
          Branch.findByPk(teacher.branch_id),
          Branch.findByPk(parsedSedeId)
        ]);
        const nomSedeProf = branchProf ? branchProf.name : `Sede #${teacher.branch_id}`;
        const nomSedeAct = branchAct ? branchAct.name : `Sede #${parsedSedeId}`;
        return res.status(400).json({
          success: false,
          message: `El profesor ${teacher.name} ${teacher.lastname} está asignado a ${nomSedeProf} y no puede dictar actividades en ${nomSedeAct}`
        });
      }
    }

    // Verificar conflictos con otras actividades (excluyendo la actual)
    const nombreEval = (name || activityActual.name).trim().toLowerCase();
    const diasEval = dayOfWeek || activityActual.shifts?.[0]?.dayOfWeek || 'Lunes a Viernes';

    const otrasActividades = await Activity.findAll({
      where: {
        id: { [Op.ne]: id },
        status: true
      },
      include: [
        { model: Shift, as: 'shifts', where: { status: true }, required: false },
        { model: Teacher, as: 'teacher' }
      ]
    });

    for (const act of otrasActividades) {
      for (const t of act.shifts || []) {
        const tIni = convertirHoraAMinutos(t.startTime);
        const tFin = convertirHoraAMinutos(t.endTime);
        const coincideDias = diasSeSuperponen(diasEval, t.dayOfWeek);
        const superponeHorario = tIni !== null && tFin !== null && horariosSeSuperponen(minIni, minFin, tIni, tFin);

        if (coincideDias && superponeHorario) {
          const mismoNombre = act.name.trim().toLowerCase() === nombreEval;
          const mismaSede = act.branch_id === parsedSedeId;
          const mismoProf = parsedProfesorId ? act.teacher_id === parsedProfesorId : (!act.teacher_id || act.teacher_id === parsedProfesorId);

          if (mismoNombre && mismaSede && mismoProf) {
            return res.status(409).json({
              success: false,
              message: `Ya existe otra actividad '${act.name}' en el mismo horario y días para esta sede y profesor.`
            });
          }

          if (parsedProfesorId && act.teacher_id === parsedProfesorId) {
            return res.status(409).json({
              success: false,
              message: `El profesor seleccionado ya dicta la actividad '${act.name}' en ese mismo horario (${t.startTime} - ${t.endTime} hs).`
            });
          }
        }
      }
    }

    req.parsedSedeId = parsedSedeId;
    req.parsedProfesorId = parsedProfesorId;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateIdActividad,
  validateCrearActividad,
  validateActualizarActividad
};
