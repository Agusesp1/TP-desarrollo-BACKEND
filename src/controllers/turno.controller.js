const Turno = require('../models/turno.model');
const Actividad = require('../models/actividad.model');
const Profesor = require('../models/profesor.model');
const Sede = require('../models/sede.model');

// Obtener todos los turnos
const obtenerTurnos = async (req, res) => {
  try {
    const { actividad_id, sede_id, dia_semana, soloActivos } = req.query;
    const whereClause = {};

    if (actividad_id) whereClause.actividad_id = actividad_id;
    if (sede_id) whereClause.sede_id = sede_id;
    if (dia_semana) whereClause.dia_semana = dia_semana;
    if (soloActivos === 'true') whereClause.estado = true;

    const turnos = await Turno.findAll({
      where: whereClause,
      include: [
        {
          model: Actividad,
          as: 'actividad',
          attributes: ['id', 'nombre', 'duracion', 'cupo']
        },
        {
          model: Profesor,
          as: 'profesor',
          attributes: ['id', 'nombre', 'apellido', 'especialidad']
        },
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'ciudad', 'direccion']
        }
      ],
      order: [['dia_semana', 'ASC'], ['horarioInicio', 'ASC']]
    });

    return res.json({
      exito: true,
      turnos
    });
  } catch (error) {
    console.error('Error al obtener turnos:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener los turnos',
      detalles: error.message
    });
  }
};

// Obtener turno por ID
const obtenerTurnoPorId = async (req, res) => {
  const { id } = req.params;
  try {
    const turno = await Turno.findByPk(id, {
      include: [
        { model: Actividad, as: 'actividad' },
        { model: Profesor, as: 'profesor' },
        { model: Sede, as: 'sede' }
      ]
    });

    if (!turno) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Turno no encontrado'
      });
    }

    return res.json({
      exito: true,
      turno
    });
  } catch (error) {
    console.error('Error al obtener turno:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener el turno',
      detalles: error.message
    });
  }
};

// Crear nuevo turno (dependiente de una actividad)
const crearTurno = async (req, res) => {
  const { actividad_id, horarioInicio, horaFin, dia_semana, profesor_id, sede_id } = req.body;

  if (!actividad_id || !horarioInicio || !horaFin) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La actividad, el horario de inicio y el horario de fin son campos obligatorios'
    });
  }

  try {
    // Validar que la actividad exista
    const actividad = await Actividad.findByPk(actividad_id);
    if (!actividad) {
      return res.status(404).json({
        exito: false,
        mensaje: 'La actividad especificada no existe'
      });
    }

    const nuevoTurno = await Turno.create({
      actividad_id: parseInt(actividad_id, 10),
      horarioInicio: horarioInicio.trim(),
      horaFin: horaFin.trim(),
      dia_semana: dia_semana || 'Lunes',
      profesor_id: profesor_id ? parseInt(profesor_id, 10) : null,
      sede_id: sede_id ? parseInt(sede_id, 10) : null,
      estado: true
    });

    // Obtener turno con relaciones para retornar al frontend
    const turnoConRelaciones = await Turno.findByPk(nuevoTurno.id, {
      include: [
        { model: Actividad, as: 'actividad' },
        { model: Profesor, as: 'profesor' },
        { model: Sede, as: 'sede' }
      ]
    });

    return res.status(201).json({
      exito: true,
      mensaje: 'Turno creado exitosamente',
      turno: turnoConRelaciones || nuevoTurno
    });
  } catch (error) {
    console.error('Error al crear turno:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al crear el turno',
      detalles: error.message
    });
  }
};

// Actualizar turno
const actualizarTurno = async (req, res) => {
  const { id } = req.params;
  const { actividad_id, horarioInicio, horaFin, dia_semana, profesor_id, sede_id, estado } = req.body;

  try {
    const turno = await Turno.findByPk(id);
    if (!turno) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Turno no encontrado'
      });
    }

    if (actividad_id) {
      const actividad = await Actividad.findByPk(actividad_id);
      if (!actividad) {
        return res.status(404).json({
          exito: false,
          mensaje: 'La actividad especificada no existe'
        });
      }
    }

    await turno.update({
      actividad_id: actividad_id !== undefined ? parseInt(actividad_id, 10) : turno.actividad_id,
      horarioInicio: horarioInicio !== undefined ? horarioInicio.trim() : turno.horarioInicio,
      horaFin: horaFin !== undefined ? horaFin.trim() : turno.horaFin,
      dia_semana: dia_semana !== undefined ? dia_semana : turno.dia_semana,
      profesor_id: profesor_id !== undefined ? (profesor_id ? parseInt(profesor_id, 10) : null) : turno.profesor_id,
      sede_id: sede_id !== undefined ? (sede_id ? parseInt(sede_id, 10) : null) : turno.sede_id,
      estado: estado !== undefined ? estado : turno.estado
    });

    const turnoActualizado = await Turno.findByPk(id, {
      include: [
        { model: Actividad, as: 'actividad' },
        { model: Profesor, as: 'profesor' },
        { model: Sede, as: 'sede' }
      ]
    });

    return res.json({
      exito: true,
      mensaje: 'Turno actualizado exitosamente',
      turno: turnoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar turno:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al actualizar el turno',
      detalles: error.message
    });
  }
};

// Toggle estado del turno
const toggleEstadoTurno = async (req, res) => {
  const { id } = req.params;
  try {
    const turno = await Turno.findByPk(id);
    if (!turno) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Turno no encontrado'
      });
    }

    const nuevoEstado = !turno.estado;
    await turno.update({ estado: nuevoEstado });

    return res.json({
      exito: true,
      mensaje: `Turno ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`,
      turno
    });
  } catch (error) {
    console.error('Error al cambiar estado del turno:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al cambiar estado del turno',
      detalles: error.message
    });
  }
};

// Eliminar turno
const eliminarTurno = async (req, res) => {
  const { id } = req.params;
  try {
    const turno = await Turno.findByPk(id);
    if (!turno) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Turno no encontrado'
      });
    }

    await turno.destroy();

    return res.json({
      exito: true,
      mensaje: 'Turno eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar turno:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al eliminar turno',
      detalles: error.message
    });
  }
};

module.exports = {
  obtenerTurnos,
  obtenerTurnoPorId,
  crearTurno,
  actualizarTurno,
  toggleEstadoTurno,
  eliminarTurno
};
