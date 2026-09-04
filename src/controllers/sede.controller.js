const Sede = require('../models/sede.model');
const Profesor = require('../models/profesor.model');

// Obtener todas las sedes
const obtenerSedes = async (req, res) => {
  try {
    const { soloActivas } = req.query;
    const whereClause = soloActivas === 'true' ? { estado: true } : {};

    const sedes = await Sede.findAll({
      where: whereClause,
      include: [
        {
          model: Profesor,
          as: 'profesores',
          attributes: ['id', 'nombre', 'apellido', 'especialidad', 'turno', 'estado']
        }
      ],
      order: [['id', 'ASC']]
    });

    return res.json({
      exito: true,
      sedes
    });
  } catch (error) {
    console.error('Error al obtener sedes:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener el listado de sedes',
      detalles: error.message
    });
  }
};

// Obtener sede por ID
const obtenerSedePorId = async (req, res) => {
  const { id } = req.params;
  try {
    const sede = await Sede.findByPk(id, {
      include: [
        {
          model: Profesor,
          as: 'profesores'
        }
      ]
    });

    if (!sede) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Sede no encontrada'
      });
    }

    return res.json({
      exito: true,
      sede
    });
  } catch (error) {
    console.error('Error al obtener sede:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener la sede',
      detalles: error.message
    });
  }
};

// Crear nueva sede
const crearSede = async (req, res) => {
  const { nombre, direccion, ciudad, telefono, email, horario_apertura, capacidad } = req.body;

  if (!nombre || !direccion) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre y la dirección de la sede son campos requeridos'
    });
  }

  try {
    const nuevaSede = await Sede.create({
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      ciudad: ciudad ? ciudad.trim() : 'Córdoba',
      telefono: telefono ? telefono.trim() : null,
      email: email ? email.trim() : null,
      horario_apertura: horario_apertura ? horario_apertura.trim() : '07:00 a 23:00 hs',
      capacidad: capacidad ? parseInt(capacidad, 10) : 150,
      estado: true
    });

    return res.status(201).json({
      exito: true,
      mensaje: 'Sede creada exitosamente',
      sede: nuevaSede
    });
  } catch (error) {
    console.error('Error al crear sede:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al crear la sede',
      detalles: error.message
    });
  }
};

// Actualizar sede
const actualizarSede = async (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, ciudad, telefono, email, horario_apertura, capacidad, estado } = req.body;

  try {
    const sede = await Sede.findByPk(id);
    if (!sede) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Sede no encontrada'
      });
    }

    await sede.update({
      nombre: nombre !== undefined ? nombre.trim() : sede.nombre,
      direccion: direccion !== undefined ? direccion.trim() : sede.direccion,
      ciudad: ciudad !== undefined ? ciudad.trim() : sede.ciudad,
      telefono: telefono !== undefined ? telefono : sede.telefono,
      email: email !== undefined ? email : sede.email,
      horario_apertura: horario_apertura !== undefined ? horario_apertura : sede.horario_apertura,
      capacidad: capacidad !== undefined ? parseInt(capacidad, 10) : sede.capacidad,
      estado: estado !== undefined ? estado : sede.estado
    });

    return res.json({
      exito: true,
      mensaje: 'Sede actualizada exitosamente',
      sede
    });
  } catch (error) {
    console.error('Error al actualizar sede:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al actualizar la sede',
      detalles: error.message
    });
  }
};

// Baja lógica / Toggle de estado de la sede
const toggleEstadoSede = async (req, res) => {
  const { id } = req.params;
  try {
    const sede = await Sede.findByPk(id);
    if (!sede) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Sede no encontrada'
      });
    }

    const nuevoEstado = !sede.estado;
    await sede.update({ estado: nuevoEstado });

    return res.json({
      exito: true,
      mensaje: `Sede ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      sede
    });
  } catch (error) {
    console.error('Error al cambiar estado de la sede:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al cambiar estado de la sede',
      detalles: error.message
    });
  }
};

// Eliminar sede permanentemente
const eliminarSede = async (req, res) => {
  const { id } = req.params;
  try {
    const sede = await Sede.findByPk(id);
    if (!sede) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Sede no encontrada'
      });
    }

    await sede.destroy();

    return res.json({
      exito: true,
      mensaje: 'Sede eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar sede:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al eliminar sede',
      detalles: error.message
    });
  }
};

module.exports = {
  obtenerSedes,
  obtenerSedePorId,
  crearSede,
  actualizarSede,
  toggleEstadoSede,
  eliminarSede
};
