const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const User = require('../models/user.model');
const Shift = require('../models/shift.model');
const Activity = require('../models/activity.model');

// Obtener todos los teachers
const obtenerProfesores = async (req, res) => {
  try {
    const { branch_id, specialty, soloActivos } = req.query;
    const whereClause = {};

    if (branch_id) {
      whereClause.branch_id = branch_id;
    }
    if (specialty) {
      whereClause.specialty = specialty;
    }
    if (soloActivos === 'true') {
      whereClause.status = true;
    }

    const teachers = await Teacher.findAll({
      where: whereClause,
      include: [
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'city', 'address']
        }
      ],
      order: [['id', 'DESC']]
    });

    return res.json({
      success: true,
      teachers
    });
  } catch (error) {
    console.error('Error al obtener teachers:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener el listado de teachers',
      detalles: error.message
    });
  }
};

// Obtener teacher por ID
const obtenerProfesorPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await Teacher.findByPk(id, {
      include: [
        {
          model: Branch,
          as: 'branch'
        }
      ]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher no encontrado'
      });
    }

    return res.json({
      success: true,
      teacher
    });
  } catch (error) {
    console.error('Error al obtener teacher:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener el teacher',
      detalles: error.message
    });
  }
};

// Crear nuevo teacher
const crearProfesor = async (req, res) => {
  const { name, lastname, dni, email, phone, specialty, shift, branch_id } = req.body;

  // Validaciones básicas
  if (!name || !lastname || !dni || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name, lastname, DNI y correo electrónico son obligatorios'
    });
  }

  try {
    // 1. Verificar si ya existe el email
    const emailExistente = await Teacher.findOne({ where: { email } });
    if (emailExistente) {
      return res.status(409).json({
        success: false,
        message: 'El correo electrónico ya pertenece a otro teacher'
      });
    }

    // 2. Verificar si ya existe el DNI
    const dniExistente = await Teacher.findOne({ where: { dni } });
    if (dniExistente) {
      return res.status(409).json({
        success: false,
        message: 'El DNI ya se encuentra registrado'
      });
    }

    // 3. Crear el teacher
    const nuevoProfesor = await Teacher.create({
      name: name.trim(),
      lastname: lastname.trim(),
      dni: dni.toString().trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.toString().trim() : null,
      specialty: specialty ? specialty.trim() : 'Musculación',
      shift: shift || 'Mañana',
      branch_id: branch_id ? parseInt(branch_id, 10) : null,
      status: true
    });

    // 4. Crear o sincronizar su cuenta de User para que pueda ingresar
    const passwordUsuario = req.body.password || dni.toString().trim();
    const userExistente = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!userExistente) {
      await User.create({
        name: name.trim(),
        lastname: lastname.trim(),
        dni: dni.toString().trim(),
        birth_date: req.body.birth_date || '1990-01-01',
        email: email.trim().toLowerCase(),
        password: passwordUsuario,
        role: 'teacher',
        bio: `Teacher oficial de FitApp. Specialty: ${specialty || 'Musculación'}. Shift: ${shift || 'Mañana'}.`,
        status: true
      });
    } else {
      await userExistente.update({
        role: 'teacher',
        name: name.trim(),
        lastname: lastname.trim(),
        dni: dni.toString().trim(),
        status: true
      });
    }

    // Cargar con relación de Branch si existe
    const teacherConSede = await Teacher.findByPk(nuevoProfesor.id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher cargado y cuenta de user habilitada exitosamente',
      teacher: teacherConSede || nuevoProfesor
    });
  } catch (error) {
    console.error('Error al crear teacher:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear el teacher',
      detalles: error.message
    });
  }
};

// Actualizar teacher
const actualizarProfesor = async (req, res) => {
  const { id } = req.params;
  const { name, lastname, dni, email, phone, specialty, shift, branch_id, status } = req.body;

  try {
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher no encontrado'
      });
    }

    // Verificar email duplicado si cambió
    if (email && email.trim().toLowerCase() !== teacher.email) {
      const emailExistente = await Teacher.findOne({ where: { email: email.trim().toLowerCase() } });
      if (emailExistente) {
        return res.status(409).json({
          success: false,
          message: 'El correo electrónico ya pertenece a otro teacher'
        });
      }
    }

    // Verificar DNI duplicado si cambió
    if (dni && dni.toString().trim() !== teacher.dni) {
      const dniExistente = await Teacher.findOne({ where: { dni: dni.toString().trim() } });
      if (dniExistente) {
        return res.status(409).json({
          success: false,
          message: 'El DNI ya se encuentra registrado'
        });
      }
    }

    const emailAnterior = teacher.email;

    await teacher.update({
      name: name !== undefined ? name.trim() : teacher.name,
      lastname: lastname !== undefined ? lastname.trim() : teacher.lastname,
      dni: dni !== undefined ? dni.toString().trim() : teacher.dni,
      email: email !== undefined ? email.trim().toLowerCase() : teacher.email,
      phone: phone !== undefined ? (phone ? phone.toString().trim() : null) : teacher.phone,
      specialty: specialty !== undefined ? specialty.trim() : teacher.specialty,
      shift: shift !== undefined ? shift : teacher.shift,
      branch_id: branch_id !== undefined ? (branch_id ? parseInt(branch_id, 10) : null) : teacher.branch_id,
      status: status !== undefined ? status : teacher.status
    });

    // Sincronizar cuenta de user si existe
    const userAsociado = await User.findOne({ where: { email: emailAnterior } });
    if (userAsociado) {
      await userAsociado.update({
        name: name !== undefined ? name.trim() : userAsociado.name,
        lastname: lastname !== undefined ? lastname.trim() : userAsociado.lastname,
        email: email !== undefined ? email.trim().toLowerCase() : userAsociado.email,
        dni: dni !== undefined ? dni.toString().trim() : userAsociado.dni,
        status: status !== undefined ? status : userAsociado.status
      });
    }

    const teacherActualizado = await Teacher.findByPk(id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    return res.json({
      success: true,
      message: 'Teacher actualizado exitosamente',
      teacher: teacherActualizado
    });
  } catch (error) {
    console.error('Error al actualizar teacher:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al actualizar el teacher',
      detalles: error.message
    });
  }
};

// Toggle de status del teacher
const toggleEstadoProfesor = async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher no encontrado'
      });
    }

    const nuevoEstado = !teacher.status;
    await teacher.update({ status: nuevoEstado });

    // Sincronizar status en cuenta de user
    const userAsociado = await User.findOne({ where: { email: teacher.email } });
    if (userAsociado) {
      await userAsociado.update({ status: nuevoEstado });
    }

    return res.json({
      success: true,
      message: `Teacher ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      teacher
    });
  } catch (error) {
    console.error('Error al cambiar status del teacher:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar status del teacher',
      detalles: error.message
    });
  }
};

// Eliminar teacher permanentemente
const eliminarProfesor = async (req, res) => {
  const { id } = req.params;
  try {
    const teacher = await Teacher.findByPk(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher no encontrado'
      });
    }

    const emailProfesor = teacher.email;
    await teacher.destroy();

    // Eliminar también su cuenta de user para revocar acceso
    const userAsociado = await User.findOne({ where: { email: emailProfesor } });
    if (userAsociado) {
      await userAsociado.destroy();
    }

    return res.json({
      success: true,
      message: 'Teacher y cuenta de user eliminados exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar teacher:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar teacher',
      detalles: error.message
    });
  }
};

// Obtener agenda, branches, activities y schedules de un teacher (por su email)
const obtenerAgendaProfesor = async (req, res) => {
  const { email } = req.params;

  try {
    const emailNormalizado = email ? email.trim().toLowerCase() : '';
    const teacher = await Teacher.findOne({
      where: { email: emailNormalizado },
      include: [{ model: Branch, as: 'branch' }]
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Profile de teacher no encontrado para este user'
      });
    }

    // Obtener todos los shifts asignados al teacher
    const shifts = await Shift.findAll({
      where: { teacher_id: teacher.id, status: true },
      include: [
        { model: Activity, as: 'activity' },
        { model: Branch, as: 'branch' }
      ],
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });

    // Mapear branches únicas donde enseña
    const branchesMap = new Map();
    if (teacher.branch) {
      branchesMap.set(teacher.branch.id, teacher.branch);
    }
    shifts.forEach((t) => {
      if (t.branch) branchesMap.set(t.branch.id, t.branch);
    });
    const branches = Array.from(branchesMap.values());

    // Mapear activities únicas que tiene a cargo (directamente asignadas o mediante shifts)
    const activitiesMap = new Map();

    // Activities asignadas directamente al teacher
    const activitiesDirectas = await Activity.findAll({
      where: { teacher_id: teacher.id, status: true },
      include: [{ model: Branch, as: 'branch' }]
    });
    activitiesDirectas.forEach((act) => {
      activitiesMap.set(act.id, act);
      if (act.branch) branchesMap.set(act.branch.id, act.branch);
    });

    shifts.forEach((t) => {
      if (t.activity) activitiesMap.set(t.activity.id, t.activity);
    });
    const activities = Array.from(activitiesMap.values());

    return res.json({
      success: true,
      teacher,
      shifts,
      branches,
      activities
    });
  } catch (error) {
    console.error('Error al obtener agenda del teacher:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener la agenda del teacher',
      detalles: error.message
    });
  }
};

module.exports = {
  obtenerProfesores,
  obtenerProfesorPorId,
  crearProfesor,
  actualizarProfesor,
  toggleEstadoProfesor,
  eliminarProfesor,
  obtenerAgendaProfesor
};
