const Sede = require('../models/sede.model');
const Profesor = require('../models/profesor.model');
const Actividad = require('../models/actividad.model');
const Turno = require('../models/turno.model');

// Constantes y helpers para formateo de días y horarios
const MAP_ABREV = {
  'Lunes': 'Lun',
  'Martes': 'Mar',
  'Miércoles': 'Mié',
  'Jueves': 'Jue',
  'Viernes': 'Vie',
  'Sábado': 'Sáb',
  'Domingo': 'Dom'
};

const ORDEN_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const abreviarDia = (dia) => MAP_ABREV[dia] || dia;

const sonConsecutivos = (dias) => {
  if (dias.length <= 1) return true;
  const indices = dias.map(d => ORDEN_DIAS.indexOf(d));
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
};

// Convierte "HH:MM" a minutos desde 00:00
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Convierte minutos a string "HH:MM"
const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Genera slots de turnos según hora de inicio, hora de fin e intervalo en minutos
const generarSlotsHorarios = (horaInicio, horaFin, intervaloMinutos) => {
  const slots = [];
  const startMin = timeToMinutes(horaInicio);
  const endMin = timeToMinutes(horaFin);
  const interval = parseInt(intervaloMinutos, 10) || 60;

  if (startMin >= endMin || interval <= 0) return slots;

  let current = startMin;
  while (current + interval <= endMin) {
    const slotInicio = minutesToTime(current);
    const slotFin = minutesToTime(current + interval);
    slots.push({ horarioInicio: slotInicio, horaFin: slotFin });
    current += interval;
  }
  return slots;
};

// Construye una cadena legible a partir del arreglo de días y horarios
const formatearHorarioApertura = (horarios_dias) => {
  if (!Array.isArray(horarios_dias) || horarios_dias.length === 0) {
    return 'Lunes a Viernes 07:00 a 23:00 - Sábados 08:00 a 20:00';
  }

  const diasAbiertos = horarios_dias.filter(d => d.abierto && d.hora_inicio && d.hora_fin);
  if (diasAbiertos.length === 0) return 'Cerrado temporalmente';

  // Agrupar días con horarios idénticos
  const grupos = [];
  horarios_dias.forEach(d => {
    if (!d.abierto) return;
    const horarioKey = `${d.hora_inicio} a ${d.hora_fin} hs`;
    const ultimoGrupo = grupos[grupos.length - 1];
    if (ultimoGrupo && ultimoGrupo.horarioKey === horarioKey) {
      ultimoGrupo.dias.push(d.dia);
    } else {
      grupos.push({ horarioKey, dias: [d.dia] });
    }
  });

  const partes = grupos.map(g => {
    const diasStr = g.dias.length === 1
      ? g.dias[0]
      : (g.dias.length > 2 && sonConsecutivos(g.dias)
        ? `${abreviarDia(g.dias[0])} a ${abreviarDia(g.dias[g.dias.length - 1])}`
        : g.dias.map(abreviarDia).join(', '));
    return `${diasStr}: ${g.horarioKey}`;
  });

  return partes.join(' | ') || 'Lunes a Sábado';
};

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
  const {
    nombre,
    direccion,
    ciudad,
    telefono,
    email,
    horario_apertura,
    capacidad,
    horarios_dias,
    generar_turnos_musculacion = true,
    duracion_turno_musculacion = 60,
    cupo_musculacion = 30,
    profesor_id = null
  } = req.body;

  if (!nombre || !direccion) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El nombre y la dirección de la sede son campos requeridos'
    });
  }

  if (telefono && telefono.toString().trim() !== '' && !/^\d+$/.test(telefono.toString().trim())) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El número de teléfono de la sede solo debe contener números'
    });
  }

  try {
    // Determinar la cadena de horario de apertura
    let horarioFinal = horario_apertura ? horario_apertura.trim() : '';
    if (!horarioFinal && Array.isArray(horarios_dias) && horarios_dias.length > 0) {
      horarioFinal = formatearHorarioApertura(horarios_dias);
    }
    if (!horarioFinal) {
      horarioFinal = 'Lunes a Viernes 07:00 a 23:00 - Sábados 08:00 a 20:00';
    }

    const nuevaSede = await Sede.create({
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      ciudad: ciudad ? ciudad.trim() : 'Córdoba',
      telefono: telefono ? telefono.trim() : null,
      email: email ? email.trim() : null,
      horario_apertura: horarioFinal,
      horarios_dias: Array.isArray(horarios_dias) ? horarios_dias : null,
      capacidad: capacidad ? parseInt(capacidad, 10) : 150,
      estado: true
    });

    let turnosGeneradosCount = 0;

    // Generar automáticamente la actividad y turnos de Musculación si fue solicitado
    if (generar_turnos_musculacion) {
      // 1. Crear actividad "Musculación & Sala de Pesas" asociada a esta sede
      const actMusculacion = await Actividad.create({
        nombre: 'Musculación & Sala de Pesas',
        duracion: parseInt(duracion_turno_musculacion, 10) || 60,
        cupo: parseInt(cupo_musculacion, 10) || 30,
        descripcion: 'Entrenamiento libre y guiado de fuerza, hipertrofia y musculación en sala de pesas y máquinas.',
        sede_id: nuevaSede.id,
        profesor_id: profesor_id ? parseInt(profesor_id, 10) : null,
        estado: true
      });

      // 2. Generar turnos para cada día habilitado
      const diasAProcesar = Array.isArray(horarios_dias) && horarios_dias.length > 0
        ? horarios_dias
        : [
            { dia: 'Lunes', abierto: true, hora_inicio: '07:00', hora_fin: '23:00' },
            { dia: 'Martes', abierto: true, hora_inicio: '07:00', hora_fin: '23:00' },
            { dia: 'Miércoles', abierto: true, hora_inicio: '07:00', hora_fin: '23:00' },
            { dia: 'Jueves', abierto: true, hora_inicio: '07:00', hora_fin: '23:00' },
            { dia: 'Viernes', abierto: true, hora_inicio: '07:00', hora_fin: '23:00' },
            { dia: 'Sábado', abierto: true, hora_inicio: '08:00', hora_fin: '20:00' }
          ];

      const turnosACrear = [];
      const duracionMin = parseInt(duracion_turno_musculacion, 10) || 60;

      for (const configDia of diasAProcesar) {
        if (configDia.abierto && configDia.hora_inicio && configDia.hora_fin) {
          const slots = generarSlotsHorarios(configDia.hora_inicio, configDia.hora_fin, duracionMin);
          for (const slot of slots) {
            turnosACrear.push({
              actividad_id: actMusculacion.id,
              horarioInicio: slot.horarioInicio,
              horaFin: slot.horaFin,
              dia_semana: configDia.dia,
              profesor_id: profesor_id ? parseInt(profesor_id, 10) : null,
              sede_id: nuevaSede.id,
              estado: true
            });
          }
        }
      }

      if (turnosACrear.length > 0) {
        await Turno.bulkCreate(turnosACrear);
        turnosGeneradosCount = turnosACrear.length;
      }
    }

    const mensajeExito = turnosGeneradosCount > 0
      ? `Sede creada exitosamente con ${turnosGeneradosCount} turnos de Musculación generados automáticamente.`
      : 'Sede creada exitosamente.';

    return res.status(201).json({
      exito: true,
      mensaje: mensajeExito,
      sede: nuevaSede,
      turnosGenerados: turnosGeneradosCount
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
  const {
    nombre,
    direccion,
    ciudad,
    telefono,
    email,
    horario_apertura,
    horarios_dias,
    capacidad,
    estado
  } = req.body;

  try {
    const sede = await Sede.findByPk(id);
    if (!sede) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Sede no encontrada'
      });
    }

    if (telefono !== undefined && telefono !== null && telefono.toString().trim() !== '' && !/^\d+$/.test(telefono.toString().trim())) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El número de teléfono de la sede solo debe contener números'
      });
    }

    let horarioFinal = horario_apertura;
    if (!horarioFinal && Array.isArray(horarios_dias) && horarios_dias.length > 0) {
      horarioFinal = formatearHorarioApertura(horarios_dias);
    }

    await sede.update({
      nombre: nombre !== undefined ? nombre.trim() : sede.nombre,
      direccion: direccion !== undefined ? direccion.trim() : sede.direccion,
      ciudad: ciudad !== undefined ? ciudad.trim() : sede.ciudad,
      telefono: telefono !== undefined ? telefono : sede.telefono,
      email: email !== undefined ? email : sede.email,
      horario_apertura: horarioFinal !== undefined ? horarioFinal : sede.horario_apertura,
      horarios_dias: horarios_dias !== undefined ? horarios_dias : sede.horarios_dias,
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
