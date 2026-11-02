const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const { Op } = require('sequelize');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validar parámetro ID y verificar existencia del profesor en BD
const validateIdProfesor = async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El identificador de profesor proporcionado no es válido'
    });
  }

  try {
    const teacher = await Teacher.findByPk(id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Profesor no encontrado'
      });
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    next(error);
  }
};

// Validar datos para la creación de un nuevo profesor y verificar unicidad en BD
const validateCrearProfesor = async (req, res, next) => {
  const { name, lastname, dni, email, phone, specialty, shift, branch_id } = req.body;

  // 1. Campos obligatorios
  if (!name || !lastname || !dni || !email) {
    return res.status(400).json({
      success: false,
      message: 'Nombre, apellido, DNI y correo electrónico son obligatorios'
    });
  }

  if (typeof name !== 'string' || name.trim().length === 0 || typeof lastname !== 'string' || lastname.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El nombre y apellido no pueden estar vacíos'
    });
  }

  const dniStr = dni.toString().trim();
  if (dniStr.length < 6 || dniStr.length > 20 || !/^\d+$/.test(dniStr)) {
    return res.status(400).json({
      success: false,
      message: 'El DNI debe contener solo números (entre 6 y 20 dígitos)'
    });
  }

  if (phone && phone.toString().trim() !== '') {
    const telStr = phone.toString().trim();
    if (!/^\d+$/.test(telStr)) {
      return res.status(400).json({
        success: false,
        message: 'El número de teléfono solo debe contener números'
      });
    }
  }

  const emailNormalizado = email.trim().toLowerCase();
  if (!emailRegex.test(emailNormalizado) || emailNormalizado.length > 150) {
    return res.status(400).json({
      success: false,
      message: 'El formato del correo electrónico no es válido'
    });
  }

  const shiftsValidos = ['Mañana', 'Tarde', 'Noche', 'Rotativo'];
  if (shift && !shiftsValidos.includes(shift)) {
    return res.status(400).json({
      success: false,
      message: `El turno debe ser uno de los siguientes: ${shiftsValidos.join(', ')}`
    });
  }

  try {
    // 2. Verificar unicidad de correo electrónico
    const emailExistente = await Teacher.findOne({ where: { email: emailNormalizado } });
    if (emailExistente) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya pertenece a otro profesor'
      });
    }

    // 3. Verificar unicidad de DNI
    const dniExistente = await Teacher.findOne({ where: { dni: dniStr } });
    if (dniExistente) {
      return res.status(409).json({
        success: false,
        message: 'El DNI ya se encuentra registrado'
      });
    }

    // 4. Verificar sede si fue provista
    if (branch_id) {
      const bId = parseInt(branch_id, 10);
      const branch = await Branch.findByPk(bId);
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'La sede asignada no existe'
        });
      }
    }

    req.emailNormalizado = emailNormalizado;
    req.dniNormalizado = dniStr;
    next();
  } catch (error) {
    next(error);
  }
};

// Validar datos para la actualización de un profesor
const validateActualizarProfesor = async (req, res, next) => {
  const { id } = req.params;
  const { name, lastname, dni, email, phone, shift, branch_id } = req.body;
  const teacher = req.teacher; // Obtenido en validateIdProfesor

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100)) {
    return res.status(400).json({ success: false, message: 'El nombre no es válido (máximo 100 caracteres)' });
  }

  if (lastname !== undefined && (typeof lastname !== 'string' || lastname.trim().length === 0 || lastname.trim().length > 100)) {
    return res.status(400).json({ success: false, message: 'El apellido no es válido (máximo 100 caracteres)' });
  }

  if (dni !== undefined) {
    const dniStr = dni.toString().trim();
    if (dniStr.length < 6 || dniStr.length > 20 || !/^\d+$/.test(dniStr)) {
      return res.status(400).json({ success: false, message: 'El DNI debe contener solo números' });
    }
  }

  if (phone !== undefined && phone !== null && phone.toString().trim() !== '') {
    if (!/^\d+$/.test(phone.toString().trim())) {
      return res.status(400).json({ success: false, message: 'El número de teléfono solo debe contener números' });
    }
  }

  if (email !== undefined) {
    const emailNorm = email.trim().toLowerCase();
    if (!emailRegex.test(emailNorm) || emailNorm.length > 150) {
      return res.status(400).json({ success: false, message: 'El formato del correo electrónico no es válido' });
    }
  }

  try {
    // Verificar email duplicado si cambió
    if (email && email.trim().toLowerCase() !== teacher.email) {
      const emailExistente = await Teacher.findOne({
        where: {
          email: email.trim().toLowerCase(),
          id: { [Op.ne]: id }
        }
      });
      if (emailExistente) {
        return res.status(409).json({
          success: false,
          message: 'El correo electrónico ya pertenece a otro profesor'
        });
      }
    }

    // Verificar DNI duplicado si cambió
    if (dni && dni.toString().trim() !== teacher.dni) {
      const dniExistente = await Teacher.findOne({
        where: {
          dni: dni.toString().trim(),
          id: { [Op.ne]: id }
        }
      });
      if (dniExistente) {
        return res.status(409).json({
          success: false,
          message: 'El DNI ya se encuentra registrado por otro profesor'
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validar y verificar obtención de agenda del profesor por email
const validateAgendaProfesor = async (req, res, next) => {
  const { email } = req.params;

  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Debe proporcionar un correo electrónico válido'
    });
  }

  try {
    const emailNormalizado = email.trim().toLowerCase();
    const teacher = await Teacher.findOne({
      where: { email: emailNormalizado },
      include: [{ model: Branch, as: 'branch' }]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Perfil de profesor no encontrado para este usuario'
      });
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateIdProfesor,
  validateCrearProfesor,
  validateActualizarProfesor,
  validateAgendaProfesor
};
