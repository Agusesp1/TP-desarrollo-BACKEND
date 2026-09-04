const Actividad = require('../models/actividad.model');
const Turno = require('../models/turno.model');
const Profesor = require('../models/profesor.model');
const Sede = require('../models/sede.model');

// Obtener todas las actividades
const obtenerActividades = async (req, res) => {
  try {
    const { soloActivas } = req.query;
    const whereClause = soloActivas === 'true' ? { estado: true } : {};

    const actividades = await Actividad.findAll({
      where: whereClause,
      include: [
        {
          model: Turno,
          as: 'turnos',
          include: [
            { model: Profesor, as: 'profesor', attributes: ['id', 'nombre', 'apellido'] },
            { model: Sede, as: 'sede', attributes: ['id', 'nombre', 'ciudad'] }
          ]
        }
      ],
      order: [['id', 'ASC']]
    });

    return res.json({
      exito: true,
      actividades
    });
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener actividades',
      detalles: error.message
    });
  }
};

// Obtener actividad por ID
const obtenerActividadPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const actividad = await Actividad.findByPk(id, {
      include: [
        {
          model: Turno,
          as: 'turnos',
          include: [
            { model: Profesor, as: 'profesor' },
            { model: Sede, as: 'sede' }
          ]
        }
      ]
    });

    if (!actividad) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Actividad no encontrada'
      });
    }

    return res.json({
      exito: true,
      actividad
    });
  } catch (error) {
    console.error('Error al obtener actividad:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener la actividad',
      detalles: error.message
    });
  }
};

// Crear nueva actividad
const crearActividad = async (req, res) => {
  const { nombre, duracion, cupo, descripcion } = req.body;

  if (!nombre || !duracion || !cupo) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre, la duración y el cupo son campos obligatorios'
    });
  }

  try {
    const nuevaActividad = await Actividad.create({
      nombre: nombre.trim(),
      duracion: parseInt(duracion, 10),
      cupo: parseInt(cupo, 10),
      descripcion: descripcion ? descripcion.trim() : null,
      estado: true
    });

    return res.status(201).json({
      exito: true,
      mensaje: 'Actividad creada exitosamente',
      actividad: nuevaActividad
    });
  } catch (error) {
    console.error('Error al crear actividad:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al crear la actividad',
      detalles: error.message
    });
  }
};

// Actualizar actividad
const actualizarActividad = async (req, res) => {
  const { id } = req.params;
  const { nombre, duracion, cupo, descripcion, estado } = req.body;

  try {
    const actividad = await Actividad.findByPk(id);
    if (!actividad) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Actividad no encontrada'
      });
    }

    await actividad.update({
      nombre: nombre !== undefined ? nombre.trim() : actividad.nombre,
      duracion: duracion !== undefined ? parseInt(duracion, 10) : actividad.duracion,
      cupo: cupo !== undefined ? parseInt(cupo, 10) : actividad.cupo,
      descripcion: descripcion !== undefined ? descripcion : actividad.descripcion,
      estado: estado !== undefined ? estado : actividad.estado
    });

    return res.json({
      exito: true,
      mensaje: 'Actividad actualizada exitosamente',
      actividad
    });
  } catch (error) {
    console.error('Error al actualizar actividad:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al actualizar la actividad',
      detalles: error.message
    });
  }
};

// Toggle estado de la actividad
const toggleEstadoActividad = async (req, res) => {
  const { id } = req.params;
  try {
    const actividad = await Actividad.findByPk(id);
    if (!actividad) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Actividad no encontrada'
      });
    }

    const nuevoEstado = !actividad.estado;
    await actividad.update({ estado: nuevoEstado });

    return res.json({
      exito: true,
      mensaje: `Actividad ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      actividad
    });
  } catch (error) {
    console.error('Error al cambiar estado de la actividad:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al cambiar estado de la actividad',
      detalles: error.message
    });
  }
};

// Eliminar actividad
const eliminarActividad = async (req, res) => {
  const { id } = req.params;
  try {
    const actividad = await Actividad.findByPk(id);
    if (!actividad) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Actividad no encontrada'
      });
    }

    await actividad.destroy();

    return res.json({
      exito: true,
      mensaje: 'Actividad eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al eliminar actividad',
      detalles: error.message
    });
  }
};

module.exports = {
  obtenerActividades,
  obtenerActividadPorId,
  crearActividad,
  actualizarActividad,
  toggleEstadoActividad,
  eliminarActividad
};
