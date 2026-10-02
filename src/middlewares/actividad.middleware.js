// Validar parámetro ID en la URL para actividades
const validarIdActividad = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de la actividad proporcionado no es válido'
    });
  }

  next();
};

// Expresión regular para validar formato HH:MM (24 horas: 00:00 a 23:59)
const formatoHoraRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const convertirHoraAMinutos = (horaStr) => {
  if (!horaStr || typeof horaStr !== 'string' || !formatoHoraRegex.test(horaStr.trim())) return null;
  const [h, m] = horaStr.trim().split(':').map(Number);
  return h * 60 + m;
};

// Validar creación de actividad
const validarCrearActividad = (req, res, next) => {
  const { nombre, duracion, cupo, descripcion, dia_semana, horarioInicio, horaFin } = req.body;

  // 1. Campos obligatorios
  if (!nombre || duracion === undefined || duracion === null || cupo === undefined || cupo === null || !dia_semana || !horarioInicio || !horaFin) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre, la duración, el cupo, los días de dictado y el horario (inicio y fin) son obligatorios'
    });
  }

  // 2. Validar nombre
  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre de la actividad no puede estar vacío'
    });
  }

  if (nombre.trim().length > 100) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre de la actividad no puede superar los 100 caracteres'
    });
  }

  // 3. Validar duración
  const duracionNum = parseInt(duracion, 10);
  if (isNaN(duracionNum) || duracionNum <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La duración debe ser un número entero mayor a 0 (minutos)'
    });
  }

  // 4. Validar cupo
  const cupoNum = parseInt(cupo, 10);
  if (isNaN(cupoNum) || cupoNum <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El cupo debe ser un número entero mayor a 0'
    });
  }

  // 5. Validar días de dictado
  if (typeof dia_semana !== 'string' || dia_semana.trim().length === 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Debe seleccionar los días de dictado de la actividad'
    });
  }

  // 6. Validar horarios reales y orden cronológico
  if (typeof horarioInicio !== 'string' || !formatoHoraRegex.test(horarioInicio.trim())) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El horario de inicio debe ser una hora válida en formato HH:MM (entre 00:00 y 23:59)'
    });
  }

  if (typeof horaFin !== 'string' || !formatoHoraRegex.test(horaFin.trim())) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El horario de fin debe ser una hora válida en formato HH:MM (entre 00:00 y 23:59)'
    });
  }

  const inicioMin = convertirHoraAMinutos(horarioInicio);
  const finMin = convertirHoraAMinutos(horaFin);
  if (finMin <= inicioMin) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El horario de fin debe ser posterior al horario de inicio'
    });
  }

  // 7. Validar descripción opcional
  if (descripcion && typeof descripcion === 'string' && descripcion.trim().length > 1000) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La descripción no puede superar los 1000 caracteres'
    });
  }

  next();
};

// Validar actualización de actividad
const validarActualizarActividad = (req, res, next) => {
  const { nombre, duracion, cupo, descripcion, estado, dia_semana, horarioInicio, horaFin } = req.body;

  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || nombre.trim().length === 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El nombre de la actividad no puede estar vacío'
      });
    }
    if (nombre.trim().length > 100) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El nombre de la actividad no puede superar los 100 caracteres'
      });
    }
  }

  if (duracion !== undefined) {
    const duracionNum = parseInt(duracion, 10);
    if (isNaN(duracionNum) || duracionNum <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'La duración debe ser un número entero mayor a 0'
      });
    }
  }

  if (cupo !== undefined) {
    const cupoNum = parseInt(cupo, 10);
    if (isNaN(cupoNum) || cupoNum <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El cupo debe ser un número entero mayor a 0'
      });
    }
  }

  if (dia_semana !== undefined) {
    if (typeof dia_semana !== 'string' || dia_semana.trim().length === 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Los días de dictado no pueden estar vacíos'
      });
    }
  }

  if (horarioInicio !== undefined) {
    if (typeof horarioInicio !== 'string' || !formatoHoraRegex.test(horarioInicio.trim())) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El horario de inicio debe ser una hora válida en formato HH:MM (entre 00:00 y 23:59)'
      });
    }
  }

  if (horaFin !== undefined) {
    if (typeof horaFin !== 'string' || !formatoHoraRegex.test(horaFin.trim())) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El horario de fin debe ser una hora válida en formato HH:MM (entre 00:00 y 23:59)'
      });
    }
  }

  if (horarioInicio !== undefined && horaFin !== undefined) {
    const inicioMin = convertirHoraAMinutos(horarioInicio);
    const finMin = convertirHoraAMinutos(horaFin);
    if (finMin <= inicioMin) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El horario de fin debe ser posterior al horario de inicio'
      });
    }
  }

  if (descripcion !== undefined && descripcion !== null) {
    if (typeof descripcion === 'string' && descripcion.trim().length > 1000) {
      return res.status(400).json({
        exito: false,
        mensaje: 'La descripción no puede superar los 1000 caracteres'
      });
    }
  }

  if (estado !== undefined && typeof estado !== 'boolean') {
    return res.status(400).json({
      exito: false,
      mensaje: 'El estado debe ser un valor booleano (true o false)'
    });
  }

  next();
};

module.exports = {
  validarIdActividad,
  validarCrearActividad,
  validarActualizarActividad
};
