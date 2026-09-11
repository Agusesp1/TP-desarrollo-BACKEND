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

// Validar creación de actividad
const validarCrearActividad = (req, res, next) => {
  const { nombre, duracion, cupo, descripcion } = req.body;

  // 1. Campos obligatorios
  if (!nombre || duracion === undefined || duracion === null || cupo === undefined || cupo === null) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre, la duración y el cupo son obligatorios'
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

  // 5. Validar descripción opcional
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
  const { nombre, duracion, cupo, descripcion, estado } = req.body;

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
