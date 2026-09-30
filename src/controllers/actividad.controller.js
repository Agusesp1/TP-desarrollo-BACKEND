const Actividad = require('../models/actividad.model');
const Turno = require('../models/turno.model');
const Profesor = require('../models/profesor.model');
const Sede = require('../models/sede.model');

// Obtener todas las actividades
const obtenerActividades = async (req, res) => {
  try {
    const { soloActivas, sede_id } = req.query;
    const whereClause = {};
    if (soloActivas === 'true') whereClause.estado = true;
    if (sede_id) whereClause.sede_id = sede_id;

    const actividades = await Actividad.findAll({
      where: whereClause,
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'ciudad']
        },
        {
          model: Profesor,
          as: 'profesor',
          attributes: ['id', 'nombre', 'apellido', 'especialidad', 'email']
        },
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
          model: Sede,
          as: 'sede'
        },
        {
          model: Profesor,
          as: 'profesor'
        },
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
  const { nombre, duracion, cupo, descripcion, sede_id, profesor_id, dia_semana, horarioInicio, horaFin } = req.body;

  if (!nombre || !duracion || !cupo || !dia_semana || !horarioInicio || !horaFin) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre, la duración, el cupo, los días de dictado y el horario son campos obligatorios'
    });
  }

  try {
    const targetSedeId = sede_id ? parseInt(sede_id, 10) : null;
    const targetProfesorId = profesor_id ? parseInt(profesor_id, 10) : null;

    if (targetProfesorId && targetSedeId) {
      const profesor = await Profesor.findByPk(targetProfesorId);
      if (profesor && profesor.sede_id && parseInt(profesor.sede_id, 10) !== targetSedeId) {
        const [sedeProf, sedeAct] = await Promise.all([
          Sede.findByPk(profesor.sede_id),
          Sede.findByPk(targetSedeId)
        ]);
        const nomSedeProf = sedeProf ? sedeProf.nombre : `Sede #${profesor.sede_id}`;
        const nomSedeAct = sedeAct ? sedeAct.nombre : `Sede #${targetSedeId}`;
        return res.status(400).json({
          exito: false,
          mensaje: `El profesor ${profesor.nombre} ${profesor.apellido} está asignado a ${nomSedeProf} y no puede dictar actividades en ${nomSedeAct}`
        });
      }
    }

    const nuevaActividad = await Actividad.create({
      nombre: nombre.trim(),
      duracion: parseInt(duracion, 10),
      cupo: parseInt(cupo, 10),
      descripcion: descripcion ? descripcion.trim() : null,
      sede_id: targetSedeId,
      profesor_id: targetProfesorId,
      estado: true
    });

    // Crear el turno u horario de dictado asociado a la actividad
    await Turno.create({
      actividad_id: nuevaActividad.id,
      horarioInicio: horarioInicio.trim(),
      horaFin: horaFin.trim(),
      dia_semana: dia_semana.trim(),
      profesor_id: targetProfesorId,
      sede_id: targetSedeId,
      estado: true
    });

    const actividadCompleta = await Actividad.findByPk(nuevaActividad.id, {
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'ciudad']
        },
        {
          model: Profesor,
          as: 'profesor',
          attributes: ['id', 'nombre', 'apellido', 'especialidad', 'email']
        },
        {
          model: Turno,
          as: 'turnos'
        }
      ]
    });

    return res.status(201).json({
      exito: true,
      mensaje: 'Actividad y horario de dictado creados exitosamente',
      actividad: actividadCompleta
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
  const { nombre, duracion, cupo, descripcion, estado, sede_id, profesor_id, dia_semana, horarioInicio, horaFin } = req.body;

  try {
    const actividad = await Actividad.findByPk(id, {
      include: [{ model: Turno, as: 'turnos' }]
    });

    if (!actividad) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Actividad no encontrada'
      });
    }

    const parsedSedeId = sede_id !== undefined ? (sede_id ? parseInt(sede_id, 10) : null) : actividad.sede_id;
    const parsedProfesorId = profesor_id !== undefined ? (profesor_id ? parseInt(profesor_id, 10) : null) : actividad.profesor_id;

    if (parsedProfesorId && parsedSedeId) {
      const profesor = await Profesor.findByPk(parsedProfesorId);
      if (profesor && profesor.sede_id && parseInt(profesor.sede_id, 10) !== parsedSedeId) {
        const [sedeProf, sedeAct] = await Promise.all([
          Sede.findByPk(profesor.sede_id),
          Sede.findByPk(parsedSedeId)
        ]);
        const nomSedeProf = sedeProf ? sedeProf.nombre : `Sede #${profesor.sede_id}`;
        const nomSedeAct = sedeAct ? sedeAct.nombre : `Sede #${parsedSedeId}`;
        return res.status(400).json({
          exito: false,
          mensaje: `El profesor ${profesor.nombre} ${profesor.apellido} está asignado a ${nomSedeProf} y no puede dictar actividades en ${nomSedeAct}`
        });
      }
    }

    await actividad.update({
      nombre: nombre !== undefined ? nombre.trim() : actividad.nombre,
      duracion: duracion !== undefined ? parseInt(duracion, 10) : actividad.duracion,
      cupo: cupo !== undefined ? parseInt(cupo, 10) : actividad.cupo,
      descripcion: descripcion !== undefined ? descripcion : actividad.descripcion,
      estado: estado !== undefined ? estado : actividad.estado,
      sede_id: parsedSedeId,
      profesor_id: parsedProfesorId
    });

    // Actualizar o crear turno si se especificaron días u horarios
    if (dia_semana !== undefined || horarioInicio !== undefined || horaFin !== undefined || sede_id !== undefined || profesor_id !== undefined) {
      if (actividad.turnos && actividad.turnos.length > 0) {
        for (const t of actividad.turnos) {
          await t.update({
            dia_semana: dia_semana !== undefined ? dia_semana.trim() : t.dia_semana,
            horarioInicio: horarioInicio !== undefined ? horarioInicio.trim() : t.horarioInicio,
            horaFin: horaFin !== undefined ? horaFin.trim() : t.horaFin,
            sede_id: parsedSedeId,
            profesor_id: parsedProfesorId
          });
        }
      } else if (horarioInicio && horaFin && dia_semana) {
        await Turno.create({
          actividad_id: actividad.id,
          horarioInicio: horarioInicio.trim(),
          horaFin: horaFin.trim(),
          dia_semana: dia_semana.trim(),
          profesor_id: parsedProfesorId,
          sede_id: parsedSedeId,
          estado: true
        });
      }
    }

    const actividadActualizada = await Actividad.findByPk(actividad.id, {
      include: [
        {
          model: Sede,
          as: 'sede',
          attributes: ['id', 'nombre', 'ciudad']
        },
        {
          model: Profesor,
          as: 'profesor',
          attributes: ['id', 'nombre', 'apellido', 'especialidad', 'email']
        },
        {
          model: Turno,
          as: 'turnos'
        }
      ]
    });

    return res.json({
      exito: true,
      mensaje: 'Actividad actualizada exitosamente',
      actividad: actividadActualizada
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
