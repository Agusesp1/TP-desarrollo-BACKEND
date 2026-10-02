// Validar parámetro ID en la URL para turnos
const validarIdTurno = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de turno proporcionado no es válido'
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

// Validar creación de turno
const validarCrearTurno = (req, res, next) => {
  const { actividad_id, horarioInicio, horaFin, dia_semana, profesor_id, sede_id } = req.body;

  // 1. Campos obligatorios
  if (!actividad_id || !horarioInicio || !horaFin) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La actividad, el horario de inicio y el horario de fin son obligatorios'
    });
  }

  // 2. Validar ID de actividad
  if (isNaN(actividad_id) || parseInt(actividad_id, 10) <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de la actividad debe ser un número entero válido'
    });
  }

  // 3. Validar formato de horario de inicio y fin (HH:MM)
  if (!formatoHoraRegex.test(horarioInicio.trim())) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El horario de inicio debe tener el formato HH:MM (ejemplo: 08:00)'
    });
  }

  if (!formatoHoraRegex.test(horaFin.trim())) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El horario de fin debe tener el formato HH:MM (ejemplo: 10:00)'
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

  // 4. Validar días de la semana
  if (dia_semana && (typeof dia_semana !== 'string' || dia_semana.trim().length > 100)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El día de la semana no puede superar los 100 caracteres'
    });
  }

  // 5. Validar IDs opcionales
  if (profesor_id && (isNaN(profesor_id) || parseInt(profesor_id, 10) <= 0)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID del profesor debe ser un número entero válido'
    });
  }

  if (sede_id && (isNaN(sede_id) || parseInt(sede_id, 10) <= 0)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de la sede debe ser un número entero válido'
    });
  }

  next();
};

// Validar actualización de turno
const validarActualizarTurno = (req, res, next) => {
  const { actividad_id, horarioInicio, horaFin, dia_semana, profesor_id, sede_id, estado } = req.body;

  if (actividad_id !== undefined && (isNaN(actividad_id) || parseInt(actividad_id, 10) <= 0)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de la actividad debe ser un número entero válido'
    });
  }

  if (horarioInicio !== undefined && !formatoHoraRegex.test(horarioInicio.trim())) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El horario de inicio debe tener el formato HH:MM (ejemplo: 08:00)'
    });
  }

  if (horaFin !== undefined && !formatoHoraRegex.test(horaFin.trim())) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El horario de fin debe tener el formato HH:MM (ejemplo: 10:00)'
    });
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

  if (dia_semana !== undefined && (typeof dia_semana !== 'string' || dia_semana.trim().length > 100)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El día de la semana no puede superar los 100 caracteres'
    });
  }

  if (profesor_id !== undefined && profesor_id !== null && (isNaN(profesor_id) || parseInt(profesor_id, 10) <= 0)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID del profesor debe ser un número entero válido'
    });
  }

  if (sede_id !== undefined && sede_id !== null && (isNaN(sede_id) || parseInt(sede_id, 10) <= 0)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de la sede debe ser un número entero válido'
    });
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
  validarIdTurno,
  validarCrearTurno,
  validarActualizarTurno
};
