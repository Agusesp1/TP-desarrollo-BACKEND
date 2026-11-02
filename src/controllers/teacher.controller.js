const Teacher = require('../models/teacher.model');
const Branch = require('../models/branch.model');
const User = require('../models/user.model');
const Shift = require('../models/shift.model');
const Activity = require('../models/activity.model');

// Obtener todos los profesores
const obtenerProfesores = async (req, res, next) => {
  try {
    const { branch_id, specialty, soloActivos } = req.query;
    const whereClause = {};

    if (branch_id) whereClause.branch_id = branch_id;
    if (specialty) whereClause.specialty = specialty;
    if (soloActivos === 'true') whereClause.status = true;

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
    next(error);
  }
};

// Obtener profesor por ID (validado y provisto por middleware)
const obtenerProfesorPorId = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      teacher: req.teacher
    });
  } catch (error) {
    next(error);
  }
};

// Crear nuevo profesor (validado previamente por middleware)
const crearProfesor = async (req, res, next) => {
  const { name, lastname, phone, specialty, shift, branch_id } = req.body;
  const email = req.emailNormalizado;
  const dni = req.dniNormalizado;

  try {
    const nuevoProfesor = await Teacher.create({
      name: name.trim(),
      lastname: lastname.trim(),
      dni,
      email,
      phone: phone ? phone.toString().trim() : null,
      specialty: specialty ? specialty.trim() : 'Musculación',
      shift: shift || 'Mañana',
      branch_id: branch_id ? parseInt(branch_id, 10) : null,
      status: true
    });

    // Sincronizar cuenta de usuario para que pueda acceder
    const passwordUsuario = req.body.password || dni;
    const userExistente = await User.findOne({ where: { email } });
    if (!userExistente) {
      await User.create({
        name: name.trim(),
        lastname: lastname.trim(),
        dni,
        birth_date: req.body.birth_date || '1990-01-01',
        email,
        password: passwordUsuario,
        role: 'teacher',
        bio: `Profesor oficial de FitApp. Especialidad: ${specialty || 'Musculación'}. Turno: ${shift || 'Mañana'}.`,
        status: true
      });
    } else {
      await userExistente.update({
        role: 'teacher',
        name: name.trim(),
        lastname: lastname.trim(),
        dni,
        status: true
      });
    }

    const teacherConSede = await Teacher.findByPk(nuevoProfesor.id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    return res.status(201).json({
      success: true,
      message: 'Profesor cargado y cuenta de usuario habilitada exitosamente',
      teacher: teacherConSede || nuevoProfesor
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar profesor (validado previamente por middleware)
const actualizarProfesor = async (req, res, next) => {
  const teacher = req.teacher;
  const { name, lastname, dni, email, phone, specialty, shift, branch_id, status } = req.body;
  const emailAnterior = teacher.email;

  try {
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

    // Sincronizar cuenta de usuario si existe
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

    const teacherActualizado = await Teacher.findByPk(teacher.id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    return res.json({
      success: true,
      message: 'Profesor actualizado exitosamente',
      teacher: teacherActualizado
    });
  } catch (error) {
    next(error);
  }
};

// Toggle de estado del profesor (validado por middleware)
const toggleEstadoProfesor = async (req, res, next) => {
  const teacher = req.teacher;

  try {
    const nuevoEstado = !teacher.status;
    await teacher.update({ status: nuevoEstado });

    const userAsociado = await User.findOne({ where: { email: teacher.email } });
    if (userAsociado) {
      await userAsociado.update({ status: nuevoEstado });
    }

    return res.json({
      success: true,
      message: `Profesor ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      teacher
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar profesor permanentemente (validado por middleware)
const eliminarProfesor = async (req, res, next) => {
  const teacher = req.teacher;
  const emailProfesor = teacher.email;

  try {
    await teacher.destroy();

    // Eliminar también su cuenta de usuario para revocar acceso
    const userAsociado = await User.findOne({ where: { email: emailProfesor } });
    if (userAsociado) {
      await userAsociado.destroy();
    }

    return res.json({
      success: true,
      message: 'Profesor y cuenta de usuario eliminados exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener agenda del profesor (validado y provisto por middleware)
const obtenerAgendaProfesor = async (req, res, next) => {
  const teacher = req.teacher;

  try {
    const shifts = await Shift.findAll({
      where: { teacher_id: teacher.id, status: true },
      include: [
        { model: Activity, as: 'activity' },
        { model: Branch, as: 'branch' }
      ],
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });

    const branchesMap = new Map();
    if (teacher.branch) {
      branchesMap.set(teacher.branch.id, teacher.branch);
    }
    shifts.forEach((t) => {
      if (t.branch) branchesMap.set(t.branch.id, t.branch);
    });
    const branches = Array.from(branchesMap.values());

    const activitiesMap = new Map();
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
    next(error);
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
