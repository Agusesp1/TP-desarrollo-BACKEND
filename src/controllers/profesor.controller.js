const Profesor = require('../models/profesor.model');
const Sede = require('../models/sede.model');

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
      telefono: telefono ? telefono.trim() : null,
      especialidad: especialidad ? especialidad.trim() : 'Musculación',
      turno: turno || 'Mañana',
      sede_id: sede_id ? parseInt(sede_id, 10) : null,
      estado: true
    });

    // Cargar con relación de Sede si existe
    const profesorConSede = await Profesor.findByPk(nuevoProfesor.id, {
      include: [{ model: Sede, as: 'sede' }]
    });

    return res.status(201).json({
      exito: true,
      mensaje: 'Profesor cargado exitosamente',
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

    await profesor.update({
      nombre: nombre !== undefined ? nombre.trim() : profesor.nombre,
      apellido: apellido !== undefined ? apellido.trim() : profesor.apellido,
      dni: dni !== undefined ? dni.toString().trim() : profesor.dni,
      email: email !== undefined ? email.trim().toLowerCase() : profesor.email,
      telefono: telefono !== undefined ? telefono : profesor.telefono,
      especialidad: especialidad !== undefined ? especialidad.trim() : profesor.especialidad,
      turno: turno !== undefined ? turno : profesor.turno,
      sede_id: sede_id !== undefined ? (sede_id ? parseInt(sede_id, 10) : null) : profesor.sede_id,
      estado: estado !== undefined ? estado : profesor.estado
    });

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

    await profesor.destroy();

    return res.json({
      exito: true,
      mensaje: 'Profesor eliminado exitosamente'
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

module.exports = {
  obtenerProfesores,
  obtenerProfesorPorId,
  crearProfesor,
  actualizarProfesor,
  toggleEstadoProfesor,
  eliminarProfesor
};
