// Validate parámetro ID en la URL para teachers
const validateIdProfesor = (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El ID de teacher proporcionado no es válido'
    });
  }

  next();
};

// Validate creación de teacher
const validateCrearProfesor = (req, res, next) => {
  const { name, lastname, dni, email, phone, specialty, shift, branch_id } = req.body;

  // 1. Campos obligatorios
  if (!name || !lastname || !dni || !email) {
    return res.status(400).json({
      success: false,
      message: 'El name, lastname, DNI y correo electrónico son obligatorios'
    });
  }

  // 2. Validate name y lastname
  if (typeof name !== 'string' || name.trim().length === 0 || typeof lastname !== 'string' || lastname.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El name y lastname no pueden estar vacíos'
    });
  }

  if (name.trim().length > 100 || lastname.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El name y lastname no pueden superar los 100 caracteres'
    });
  }

  // 3. Validate DNI
  const dniStr = dni.toString().trim();
  if (dniStr.length < 6 || dniStr.length > 20) {
    return res.status(400).json({
      success: false,
      message: 'El DNI debe tener entre 6 y 20 caracteres'
    });
  }

  if (!/^\d+$/.test(dniStr)) {
    return res.status(400).json({
      success: false,
      message: 'El DNI solo debe contener dígitos numéricos'
    });
  }

  // Validate teléfono (si fue provisto, solo números)
  if (phone && phone.toString().trim() !== '') {
    const telStr = phone.toString().trim();
    if (!/^\d+$/.test(telStr)) {
      return res.status(400).json({
        success: false,
        message: 'El número de teléfono solo debe contener números'
      });
    }
  }

  // 4. Validate correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  if (email.length > 150) {
    return res.status(400).json({
      success: false,
      message: 'El correo electrónico no puede superar los 150 caracteres'
    });
  }

  // 5. Validate shift si fue provisto
  const shiftsValidos = ['Mañana', 'Tarde', 'Noche', 'Rotativo'];
  if (shift && !shiftsValidos.includes(shift)) {
    return res.status(400).json({
      success: false,
      message: `El shift debe ser uno de los siguientes: ${shiftsValidos.join(', ')}`
    });
  }

  // 6. Validate branch_id si fue provisto
  if (branch_id && (isNaN(branch_id) || parseInt(branch_id, 10) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'El ID de la branch debe ser un número entero válido'
    });
  }

  next();
};

// Validate actualización de teacher
const validateActualizarProfesor = (req, res, next) => {
  const { name, lastname, dni, email, shift, branch_id, status } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'El name no es válido (máximo 100 caracteres)'
    });
  }

  if (lastname !== undefined && (typeof lastname !== 'string' || lastname.trim().length === 0 || lastname.trim().length > 100)) {
    return res.status(400).json({
      success: false,
      message: 'El lastname no es válido (máximo 100 caracteres)'
    });
  }

  if (dni !== undefined) {
    const dniStr = dni.toString().trim();
    if (dniStr.length < 6 || dniStr.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'El DNI debe tener entre 6 y 20 caracteres'
      });
    }
    if (!/^\d+$/.test(dniStr)) {
      return res.status(400).json({
        success: false,
        message: 'El DNI solo debe contener dígitos numéricos'
      });
    }
  }

  if (req.body.phone !== undefined && req.body.phone !== null && req.body.phone.toString().trim() !== '') {
    const telStr = req.body.phone.toString().trim();
    if (!/^\d+$/.test(telStr)) {
      return res.status(400).json({
        success: false,
        message: 'El número de teléfono solo debe contener números'
      });
    }
  }

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'El formato del correo electrónico no es válido'
      });
    }
  }

  const shiftsValidos = ['Mañana', 'Tarde', 'Noche', 'Rotativo'];
  if (shift !== undefined && !shiftsValidos.includes(shift)) {
    return res.status(400).json({
      success: false,
      message: `El shift debe ser uno de los siguientes: ${shiftsValidos.join(', ')}`
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
  validateIdProfesor,
  validateCrearProfesor,
  validateActualizarProfesor
};
