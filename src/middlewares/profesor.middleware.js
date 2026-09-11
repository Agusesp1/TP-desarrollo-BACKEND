// Validar parámetro ID en la URL para profesores
const validarIdProfesor = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de profesor proporcionado no es válido'
    });
  }

  next();
};

// Validar creación de profesor
const validarCrearProfesor = (req, res, next) => {
  const { nombre, apellido, dni, email, telefono, especialidad, turno, sede_id } = req.body;

  // 1. Campos obligatorios
  if (!nombre || !apellido || !dni || !email) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre, apellido, DNI y correo electrónico son obligatorios'
    });
  }

  // 2. Validar nombre y apellido
  if (typeof nombre !== 'string' || nombre.trim().length === 0 || typeof apellido !== 'string' || apellido.trim().length === 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre y apellido no pueden estar vacíos'
    });
  }

  if (nombre.trim().length > 100 || apellido.trim().length > 100) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre y apellido no pueden superar los 100 caracteres'
    });
  }

  // 3. Validar DNI
  const dniStr = dni.toString().trim();
  if (dniStr.length < 6 || dniStr.length > 20) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El DNI debe tener entre 6 y 20 caracteres'
    });
  }

  // 4. Validar correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El formato del correo electrónico no es válido'
    });
  }

  if (email.length > 150) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El correo electrónico no puede superar los 150 caracteres'
    });
  }

  // 5. Validar turno si fue provisto
  const turnosValidos = ['Mañana', 'Tarde', 'Noche', 'Rotativo'];
  if (turno && !turnosValidos.includes(turno)) {
    return res.status(400).json({
      exito: false,
      mensaje: `El turno debe ser uno de los siguientes: ${turnosValidos.join(', ')}`
    });
  }

  // 6. Validar sede_id si fue provisto
  if (sede_id && (isNaN(sede_id) || parseInt(sede_id, 10) <= 0)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El ID de la sede debe ser un número entero válido'
    });
  }

  next();
};

// Validar actualización de profesor
const validarActualizarProfesor = (req, res, next) => {
  const { nombre, apellido, dni, email, turno, sede_id, estado } = req.body;

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0 || nombre.trim().length > 100)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre no es válido (máximo 100 caracteres)'
    });
  }

  if (apellido !== undefined && (typeof apellido !== 'string' || apellido.trim().length === 0 || apellido.trim().length > 100)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El apellido no es válido (máximo 100 caracteres)'
    });
  }

  if (dni !== undefined) {
    const dniStr = dni.toString().trim();
    if (dniStr.length < 6 || dniStr.length > 20) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El DNI debe tener entre 6 y 20 caracteres'
      });
    }
  }

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 150) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El formato del correo electrónico no es válido'
      });
    }
  }

  const turnosValidos = ['Mañana', 'Tarde', 'Noche', 'Rotativo'];
  if (turno !== undefined && !turnosValidos.includes(turno)) {
    return res.status(400).json({
      exito: false,
      mensaje: `El turno debe ser uno de los siguientes: ${turnosValidos.join(', ')}`
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
  validarIdProfesor,
  validarCrearProfesor,
  validarActualizarProfesor
};
