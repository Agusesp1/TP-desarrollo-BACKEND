const Profesor = require('../models/profesor.model');
const Sede = require('../models/sede.model');
const Usuario = require('../models/usuario.model');
const Turno = require('../models/turno.model');
const Actividad = require('../models/actividad.model');

// Obtener todos los profesores
const obtenerProfesores = async (req, res) => {
  try {
    const { sede_id, especialidad, soloActivos } = req.query;
    const whereClause = {};

    if (sede_id) {
      whereClause.sede_id = sede_id;
    }
    if (especialidad) {
      whereClause.especialidad = especialidad;
    }
    if (soloActivos === 'true') {
      whereClause.estado = true;
    }

    const profesores = await Profesor.findAll({
      where: whereClause,
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'ciudad', 'direccion']
        }
      ],
      order: [['id', 'DESC']]
    });

    return res.json({
      exito: true,
      profesores
    });
  } catch (error) {
    console.error('Error al obtener profesores:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener el listado de profesores',
      detalles: error.message
    });
  }
};

// Obtener profesor por ID
const obtenerProfesorPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const profesor = await Profesor.findByPk(id, {
      include: [
        {
          model: Sede,
          as: 'sede'
        }
      ]
    });

    if (!profesor) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Profesor no encontrado'
      });
    }

    return res.json({
      exito: true,
      profesor
    });
  } catch (error) {
    console.error('Error al obtener profesor:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener el profesor',
      detalles: error.message
    });
  }
};

// Crear nuevo profesor
const crearProfesor = async (req, res) => {
  const { nombre, apellido, dni, email, telefono, especialidad, turno, sede_id } = req.body;

  // Validaciones básicas
  if (!nombre || !apellido || !dni || !email) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Nombre, apellido, DNI y correo electrónico son obligatorios'
    });
  }

  try {
    // 1. Verificar si ya existe el email
    const emailExistente = await Profesor.findOne({ where: { email } });
    if (emailExistente) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El correo electrónico ya pertenece a otro profesor'
      });
    }

    // 2. Verificar si ya existe el DNI
    const dniExistente = await Profesor.findOne({ where: { dni } });
    if (dniExistente) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El DNI ya se encuentra registrado'
      });
    }

    // 3. Crear el profesor
    const nuevoProfesor = await Profesor.create({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.toString().trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono ? telefono.toString().trim() : null,
      especialidad: especialidad ? especialidad.trim() : 'Musculación',
      turno: turno || 'Mañana',
      sede_id: sede_id ? parseInt(sede_id, 10) : null,
      estado: true
    });

    // 4. Crear o sincronizar su cuenta de Usuario para que pueda ingresar
    const passwordUsuario = req.body.password || dni.toString().trim();
    const usuarioExistente = await Usuario.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!usuarioExistente) {
      await Usuario.create({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.toString().trim(),
        fecha_nacimiento: req.body.fecha_nacimiento || '1990-01-01',
        email: email.trim().toLowerCase(),
        password: passwordUsuario,
        rol: 'profesor',
        bio: `Profesor oficial de FitApp. Especialidad: ${especialidad || 'Musculación'}. Turno: ${turno || 'Mañana'}.`,
        estado: true
      });
    } else {
      await usuarioExistente.update({
        rol: 'profesor',
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.toString().trim(),
        estado: true
      });
    }

    // Cargar con relación de Sede si existe
    const profesorConSede = await Profesor.findByPk(nuevoProfesor.id, {
      include: [{ model: Sede, as: 'sede' }]
    });

    return res.status(201).json({
      exito: true,
      mensaje: 'Profesor cargado y cuenta de usuario habilitada exitosamente',
      profesor: profesorConSede || nuevoProfesor
    });
  } catch (error) {
    console.error('Error al crear profesor:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al crear el profesor',
      detalles: error.message
    });
  }
};

// Actualizar profesor
const actualizarProfesor = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, dni, email, telefono, especialidad, turno, sede_id, estado } = req.body;

  try {
    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Profesor no encontrado'
      });
    }

    // Verificar email duplicado si cambió
    if (email && email.trim().toLowerCase() !== profesor.email) {
      const emailExistente = await Profesor.findOne({ where: { email: email.trim().toLowerCase() } });
      if (emailExistente) {
        return res.status(409).json({
          exito: false,
          mensaje: 'El correo electrónico ya pertenece a otro profesor'
        });
      }
    }

    // Verificar DNI duplicado si cambió
    if (dni && dni.toString().trim() !== profesor.dni) {
      const dniExistente = await Profesor.findOne({ where: { dni: dni.toString().trim() } });
      if (dniExistente) {
        return res.status(409).json({
          exito: false,
          mensaje: 'El DNI ya se encuentra registrado'
        });
      }
    }

    const emailAnterior = profesor.email;

    await profesor.update({
      nombre: nombre !== undefined ? nombre.trim() : profesor.nombre,
      apellido: apellido !== undefined ? apellido.trim() : profesor.apellido,
      dni: dni !== undefined ? dni.toString().trim() : profesor.dni,
      email: email !== undefined ? email.trim().toLowerCase() : profesor.email,
      telefono: telefono !== undefined ? (telefono ? telefono.toString().trim() : null) : profesor.telefono,
      especialidad: especialidad !== undefined ? especialidad.trim() : profesor.especialidad,
      turno: turno !== undefined ? turno : profesor.turno,
      sede_id: sede_id !== undefined ? (sede_id ? parseInt(sede_id, 10) : null) : profesor.sede_id,
      estado: estado !== undefined ? estado : profesor.estado
    });

    // Sincronizar cuenta de usuario si existe
    const usuarioAsociado = await Usuario.findOne({ where: { email: emailAnterior } });
    if (usuarioAsociado) {
      await usuarioAsociado.update({
        nombre: nombre !== undefined ? nombre.trim() : usuarioAsociado.nombre,
        apellido: apellido !== undefined ? apellido.trim() : usuarioAsociado.apellido,
        email: email !== undefined ? email.trim().toLowerCase() : usuarioAsociado.email,
        dni: dni !== undefined ? dni.toString().trim() : usuarioAsociado.dni,
        estado: estado !== undefined ? estado : usuarioAsociado.estado
      });
    }

    const profesorActualizado = await Profesor.findByPk(id, {
      include: [{ model: Sede, as: 'sede' }]
    });

    return res.json({
      exito: true,
      mensaje: 'Profesor actualizado exitosamente',
      profesor: profesorActualizado
    });
  } catch (error) {
    console.error('Error al actualizar profesor:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al actualizar el profesor',
      detalles: error.message
    });
  }
};

// Toggle de estado del profesor
const toggleEstadoProfesor = async (req, res) => {
  const { id } = req.params;
  try {
    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Profesor no encontrado'
      });
    }

    const nuevoEstado = !profesor.estado;
    await profesor.update({ estado: nuevoEstado });

    // Sincronizar estado en cuenta de usuario
    const usuarioAsociado = await Usuario.findOne({ where: { email: profesor.email } });
    if (usuarioAsociado) {
      await usuarioAsociado.update({ estado: nuevoEstado });
    }

    return res.json({
      exito: true,
      mensaje: `Profesor ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      profesor
    });
  } catch (error) {
    console.error('Error al cambiar estado del profesor:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al cambiar estado del profesor',
      detalles: error.message
    });
  }
};

// Eliminar profesor permanentemente
const eliminarProfesor = async (req, res) => {
  const { id } = req.params;
  try {
    const profesor = await Profesor.findByPk(id);
    if (!profesor) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Profesor no encontrado'
      });
    }

    const emailProfesor = profesor.email;
    await profesor.destroy();

    // Eliminar también su cuenta de usuario para revocar acceso
    const usuarioAsociado = await Usuario.findOne({ where: { email: emailProfesor } });
    if (usuarioAsociado) {
      await usuarioAsociado.destroy();
    }

    return res.json({
      exito: true,
      mensaje: 'Profesor y cuenta de usuario eliminados exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar profesor:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al eliminar profesor',
      detalles: error.message
    });
  }
};

// Obtener agenda, sedes, actividades y horarios de un profesor (por su email)
const obtenerAgendaProfesor = async (req, res) => {
  const { email } = req.params;

  try {
    const emailNormalizado = email ? email.trim().toLowerCase() : '';
    const profesor = await Profesor.findOne({
      where: { email: emailNormalizado },
      include: [{ model: Sede, as: 'sede' }]
    });

    if (!profesor) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Perfil de profesor no encontrado para este usuario'
      });
    }

    // Obtener todos los turnos asignados al profesor
    const turnos = await Turno.findAll({
      where: { profesor_id: profesor.id, estado: true },
      include: [
        { model: Actividad, as: 'actividad' },
        { model: Sede, as: 'sede' }
      ],
      order: [['dia_semana', 'ASC'], ['horarioInicio', 'ASC']]
    });

    // Mapear sedes únicas donde enseña
    const sedesMap = new Map();
    if (profesor.sede) {
      sedesMap.set(profesor.sede.id, profesor.sede);
    }
    turnos.forEach((t) => {
      if (t.sede) sedesMap.set(t.sede.id, t.sede);
    });
    const sedes = Array.from(sedesMap.values());

    // Mapear actividades únicas que tiene a cargo (directamente asignadas o mediante turnos)
    const actividadesMap = new Map();

    // Actividades asignadas directamente al profesor
    const actividadesDirectas = await Actividad.findAll({
      where: { profesor_id: profesor.id, estado: true },
      include: [{ model: Sede, as: 'sede' }]
    });
    actividadesDirectas.forEach((act) => {
      actividadesMap.set(act.id, act);
      if (act.sede) sedesMap.set(act.sede.id, act.sede);
    });

    turnos.forEach((t) => {
      if (t.actividad) actividadesMap.set(t.actividad.id, t.actividad);
    });
    const actividades = Array.from(actividadesMap.values());

    return res.json({
      exito: true,
      profesor,
      turnos,
      sedes,
      actividades
    });
  } catch (error) {
    console.error('Error al obtener agenda del profesor:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener la agenda del profesor',
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
