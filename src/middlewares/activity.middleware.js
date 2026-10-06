// Validate parámetro ID en la URL para activities
const validateIdActividad = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El ID de la activity proporcionado no es válido'
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

// Validate creación de activity
const validateCrearActividad = (req, res, next) => {
  const { name, duration, capacity, description, dayOfWeek, startTime, endTime } = req.body;

  // 1. Campos obligatorios
  if (!name || duration === undefined || duration === null || capacity === undefined || capacity === null || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: 'El name, la duración, el capacity, los días de dictado y el schedule (home y fin) son obligatorios'
    });
  }

  // 2. Validate name
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El name de la activity no puede estar vacío'
    });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El name de la activity no puede superar los 100 caracteres'
    });
  }

  // 3. Validate duración
  const durationNum = parseInt(duration, 10);
  if (isNaN(durationNum) || durationNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'La duración debe ser un número entero mayor a 0 (minutos)'
    });
  }

  // 4. Validate capacity
  const capacityNum = parseInt(capacity, 10);
  if (isNaN(capacityNum) || capacityNum <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El capacity debe ser un número entero mayor a 0'
    });
  }

  // 5. Validate días de dictado
  if (typeof dayOfWeek !== 'string' || dayOfWeek.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Debe seleccionar los días de dictado de la activity'
    });
  }

  // 6. Validate schedules reales y orden cronológico
  if (typeof startTime !== 'string' || !formatoHoraRegex.test(startTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El schedule de home debe ser una hora válida en formato HH:MM (entre 00:00 y 23:59)'
    });
  }

  if (typeof endTime !== 'string' || !formatoHoraRegex.test(endTime.trim())) {
    return res.status(400).json({
      success: false,
      message: 'El schedule de fin debe ser una hora válida en formato HH:MM (entre 00:00 y 23:59)'
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

  // 7. Validate descripción opcional
  if (description && typeof description === 'string' && description.trim().length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'La descripción no puede superar los 1000 caracteres'
    });
  }

  next();
};

// Validate actualización de activity
const validateActualizarActividad = (req, res, next) => {
  const { name, duration, capacity, description, status, dayOfWeek, startTime, endTime } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El name de la activity no puede estar vacío'
      });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'El name de la activity no puede superar los 100 caracteres'
      });
    }
  }

  if (duration !== undefined) {
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La duración debe ser un número entero mayor a 0'
      });
    }
  }

  if (capacity !== undefined) {
    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El capacity debe ser un número entero mayor a 0'
      });
    }
  }

  if (dayOfWeek !== undefined) {
    if (typeof dayOfWeek !== 'string' || dayOfWeek.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Los días de dictado no pueden estar vacíos'
      });
    }
  }

  if (startTime !== undefined) {
    if (typeof startTime !== 'string' || !formatoHoraRegex.test(startTime.trim())) {
      return res.status(400).json({
        success: false,
        message: 'El schedule de home debe ser una hora válida en formato HH:MM (entre 00:00 y 23:59)'
      });
    }
  }

  if (endTime !== undefined) {
    if (typeof endTime !== 'string' || !formatoHoraRegex.test(endTime.trim())) {
      return res.status(400).json({
        success: false,
        message: 'El schedule de fin debe ser una hora válida en formato HH:MM (entre 00:00 y 23:59)'
      });
    }
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

  if (description !== undefined && description !== null) {
    if (typeof description === 'string' && description.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'La descripción no puede superar los 1000 caracteres'
      });
    }
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
  validateIdActividad,
  validateCrearActividad,
  validateActualizarActividad
};
