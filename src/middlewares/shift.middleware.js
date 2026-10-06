// Validate parámetro ID en la URL para shifts
const validateIdTurno = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El ID de shift proporcionado no es válido'
    });
  }

  next();
};

// Expresión regular para validate formato HH:MM (24 horas: 00:00 a 23:59)
const formatoHoraRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const convertirHoraAMinutos = (horaStr) => {
  if (!horaStr || typeof horaStr !== 'string' || !formatoHoraRegex.test(horaStr.trim())) return null;
  const [h, m] = horaStr.trim().split(':').map(Number);
  return h * 60 + m;
};

// Validate creación de shift
const validateCrearTurno = (req, res, next) => {
  const { activity_id, startTime, endTime, dayOfWeek, teacher_id, branch_id } = req.body;

  // 1. Campos obligatorios
  if (!activity_id || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: 'La activity, el schedule de home y el schedule de fin son obligatorios'
    });
  }

  // 2. Validate ID de activity
  if (isNaN(activity_id) || parseInt(activity_id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El ID de la activity debe ser un número entero válido'
    });
  }

  // 3. Validate formato de schedule de home y fin (HH:MM)
  if (!formatoHoraRegex.test(startTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El schedule de home debe tener el formato HH:MM (ejemplo: 08:00)'
    });
  }

  if (!formatoHoraRegex.test(endTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El schedule de fin debe tener el formato HH:MM (ejemplo: 10:00)'
    });
  }

  const homeMin = convertirHoraAMinutos(startTime);
  const finMin = convertirHoraAMinutos(endTime);
  if (finMin <= homeMin) {
    return res.status(400).json({
      success: false,
      message: 'El schedule de fin debe ser posterior al schedule de home'
    });
  }

  // 4. Validate días de la semana
  if (dayOfWeek && (typeof dayOfWeek !== 'string' || dayOfWeek.trim().length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'El día de la semana no puede superar los 100 caracteres'
    });
  }

  // 5. Validate IDs opcionales
  if (teacher_id && (isNaN(teacher_id) || parseInt(teacher_id, 10) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'El ID del teacher debe ser un número entero válido'
    });
  }

  if (branch_id && (isNaN(branch_id) || parseInt(branch_id, 10) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'El ID de la branch debe ser un número entero válido'
    });
  }

  next();
};

// Validate actualización de shift
const validateActualizarTurno = (req, res, next) => {
  const { activity_id, startTime, endTime, dayOfWeek, teacher_id, branch_id, status } = req.body;

  if (activity_id !== undefined && (isNaN(activity_id) || parseInt(activity_id, 10) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'El ID de la activity debe ser un número entero válido'
    });
  }

  if (startTime !== undefined && !formatoHoraRegex.test(startTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El schedule de home debe tener el formato HH:MM (ejemplo: 08:00)'
    });
  }

  if (endTime !== undefined && !formatoHoraRegex.test(endTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El schedule de fin debe tener el formato HH:MM (ejemplo: 10:00)'
    });
  }

  if (startTime !== undefined && endTime !== undefined) {
    const homeMin = convertirHoraAMinutos(startTime);
    const finMin = convertirHoraAMinutos(endTime);
    if (finMin <= homeMin) {
      return res.status(400).json({
        success: false,
        message: 'El schedule de fin debe ser posterior al schedule de home'
      });
    }
  }

  if (dayOfWeek !== undefined && (typeof dayOfWeek !== 'string' || dayOfWeek.trim().length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'El día de la semana no puede superar los 100 caracteres'
    });
  }

  if (teacher_id !== undefined && teacher_id !== null && (isNaN(teacher_id) || parseInt(teacher_id, 10) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'El ID del teacher debe ser un número entero válido'
    });
  }

  if (branch_id !== undefined && branch_id !== null && (isNaN(branch_id) || parseInt(branch_id, 10) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'El ID de la branch debe ser un número entero válido'
    });
  }

  if (status !== undefined && typeof status !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'El status debe ser un valor booleano (true o false)'
    });
  }

  next();
};

module.exports = {
  validateIdTurno,
  validateCrearTurno,
  validateActualizarTurno
};
