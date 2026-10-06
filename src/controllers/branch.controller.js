const Branch = require('../models/branch.model');
const Teacher = require('../models/teacher.model');
const Activity = require('../models/activity.model');
const Shift = require('../models/shift.model');

// Constantes y helpers para formateo de días y schedules
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

const abreviarDia = (day) => MAP_ABREV[day] || day;

const sonConsecutivos = (days) => {
  if (days.length <= 1) return true;
  const indices = days.map(d => ORDEN_DIAS.indexOf(d));
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

// Genera slots de shifts según hora de home, hora de fin e intervalo en minutos
const generarSlotsHorarios = (horaInicio, endTime, intervaloMinutos) => {
  const slots = [];
  const startMin = timeToMinutes(horaInicio);
  const endMin = timeToMinutes(endTime);
  const interval = parseInt(intervaloMinutos, 10) || 60;

  if (startMin >= endMin || interval <= 0) return slots;

  let current = startMin;
  while (current + interval <= endMin) {
    const slotInicio = minutesToTime(current);
    const slotFin = minutesToTime(current + interval);
    slots.push({ startTime: slotInicio, endTime: slotFin });
    current += interval;
  }
  return slots;
};

// Construye una cadena legible a partir del arreglo de días y schedules
const formatearHorarioApertura = (schedule_days) => {
  if (!Array.isArray(schedule_days) || schedule_days.length === 0) {
    return 'Lunes a Viernes 07:00 a 23:00 - Sábados 08:00 a 20:00';
  }

  const diasAbiertos = schedule_days.filter(d => d.abierto && d.hora_home && d.hora_fin);
  if (diasAbiertos.length === 0) return 'Cerrado temporalmente';

  // Agrupar días con schedules idénticos
  const grupos = [];
  schedule_days.forEach(d => {
    if (!d.abierto) return;
    const horarioKey = `${d.hora_home} a ${d.hora_fin} hs`;
    const ultimoGrupo = grupos[grupos.length - 1];
    if (ultimoGrupo && ultimoGrupo.horarioKey === horarioKey) {
      ultimoGrupo.days.push(d.day);
    } else {
      grupos.push({ horarioKey, days: [d.day] });
    }
  });

  const partes = grupos.map(g => {
    const diasStr = g.days.length === 1
      ? g.days[0]
      : (g.days.length > 2 && sonConsecutivos(g.days)
        ? `${abreviarDia(g.days[0])} a ${abreviarDia(g.days[g.days.length - 1])}`
        : g.days.map(abreviarDia).join(', '));
    return `${diasStr}: ${g.horarioKey}`;
  });

  return partes.join(' | ') || 'Lunes a Sábado';
};

// Obtener todas las branches
const obtenerSedes = async (req, res) => {
  try {
    const { soloActivas } = req.query;
    const whereClause = soloActivas === 'true' ? { status: true } : {};

    const branches = await Branch.findAll({
      where: whereClause,
      include: [
        {
          model: Teacher,
          as: 'teachers',
          attributes: ['id', 'name', 'lastname', 'specialty', 'shift', 'status']
        }
      ],
      order: [['id', 'ASC']]
    });

    return res.json({
      success: true,
      branches
    });
  } catch (error) {
    console.error('Error al obtener branches:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener el listado de branches',
      detalles: error.message
    });
  }
};

// Obtener branch por ID
const obtenerSedePorId = async (req, res) => {
  const { id } = req.params;
  try {
    const branch = await Branch.findByPk(id, {
      include: [
        {
          model: Teacher,
          as: 'teachers'
        }
      ]
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch no encontrada'
      });
    }

    return res.json({
      success: true,
      branch
    });
  } catch (error) {
    console.error('Error al obtener branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener la branch',
      detalles: error.message
    });
  }
};

// Crear nueva branch
const crearSede = async (req, res) => {
  const {
    name,
    address,
    city,
    phone,
    email,
    opening_hours,
    capacity,
    schedule_days,
    generar_shifts_musculacion = true,
    duration_shift_musculacion = 60,
    capacity_musculacion = 30,
    teacher_id = null
  } = req.body;

  if (!name || !address) {
    return res.status(400).json({
      success: false,
      message: 'El name y la dirección de la branch son campos requeridos'
    });
  }

  if (phone && phone.toString().trim() !== '' && !/^\d+$/.test(phone.toString().trim())) {
    return res.status(400).json({
      success: false,
      message: 'El número de teléfono de la branch solo debe contener números'
    });
  }

  try {
    // Determinar la cadena de schedule de apertura
    let horarioFinal = opening_hours ? opening_hours.trim() : '';
    if (!horarioFinal && Array.isArray(schedule_days) && schedule_days.length > 0) {
      horarioFinal = formatearHorarioApertura(schedule_days);
    }
    if (!horarioFinal) {
      horarioFinal = 'Lunes a Viernes 07:00 a 23:00 - Sábados 08:00 a 20:00';
    }

    const nuevaSede = await Branch.create({
      name: name.trim(),
      address: address.trim(),
      city: city ? city.trim() : 'Córdoba',
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      opening_hours: horarioFinal,
      schedule_days: Array.isArray(schedule_days) ? schedule_days : null,
      capacity: capacity ? parseInt(capacity, 10) : 150,
      status: true
    });

    let shiftsGeneradosCount = 0;

    // Generar automáticamente la activity y shifts de Musculación si fue solicitado
    if (generar_shifts_musculacion) {
      // 1. Crear activity "Musculación & Sala de Pesas" asociada a esta branch
      const actMuscle = await Activity.create({
        name: 'Musculación & Sala de Pesas',
        duration: parseInt(duration_shift_musculacion, 10) || 60,
        capacity: parseInt(capacity_musculacion, 10) || 30,
        description: 'Training libre y guiado de fuerza, hipertrofia y musculación en sala de pesas y máquinas.',
        branch_id: nuevaSede.id,
        teacher_id: teacher_id ? parseInt(teacher_id, 10) : null,
        status: true
      });

      // 2. Generar shifts para cada día habilitado
      const diasAProcesar = Array.isArray(schedule_days) && schedule_days.length > 0
        ? schedule_days
        : [
            { day: 'Lunes', abierto: true, hora_home: '07:00', hora_fin: '23:00' },
            { day: 'Martes', abierto: true, hora_home: '07:00', hora_fin: '23:00' },
            { day: 'Miércoles', abierto: true, hora_home: '07:00', hora_fin: '23:00' },
            { day: 'Jueves', abierto: true, hora_home: '07:00', hora_fin: '23:00' },
            { day: 'Viernes', abierto: true, hora_home: '07:00', hora_fin: '23:00' },
            { day: 'Sábado', abierto: true, hora_home: '08:00', hora_fin: '20:00' }
          ];

      const shiftsACrear = [];
      const durationMin = parseInt(duration_shift_musculacion, 10) || 60;

      for (const configDia of diasAProcesar) {
        if (configDia.abierto && configDia.hora_home && configDia.hora_fin) {
          const slots = generarSlotsHorarios(configDia.hora_home, configDia.hora_fin, durationMin);
          for (const slot of slots) {
            shiftsACrear.push({
              activity_id: actMuscle.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              dayOfWeek: configDia.day,
              teacher_id: teacher_id ? parseInt(teacher_id, 10) : null,
              branch_id: nuevaSede.id,
              status: true
            });
          }
        }
      }

      if (shiftsACrear.length > 0) {
        await Shift.bulkCreate(shiftsACrear);
        shiftsGeneradosCount = shiftsACrear.length;
      }
    }

    const messageExito = shiftsGeneradosCount > 0
      ? `Branch creada exitosamente con ${shiftsGeneradosCount} shifts de Musculación generados automáticamente.`
      : 'Branch creada exitosamente.';

    return res.status(201).json({
      success: true,
      message: messageExito,
      branch: nuevaSede,
      shiftsGenerados: shiftsGeneradosCount
    });
  } catch (error) {
    console.error('Error al crear branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear la branch',
      detalles: error.message
    });
  }
};

// Actualizar branch
const actualizarSede = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    address,
    city,
    phone,
    email,
    opening_hours,
    schedule_days,
    capacity,
    status
  } = req.body;

  try {
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch no encontrada'
      });
    }

    if (phone !== undefined && phone !== null && phone.toString().trim() !== '' && !/^\d+$/.test(phone.toString().trim())) {
      return res.status(400).json({
        success: false,
        message: 'El número de teléfono de la branch solo debe contener números'
      });
    }

    let horarioFinal = opening_hours;
    if (!horarioFinal && Array.isArray(schedule_days) && schedule_days.length > 0) {
      horarioFinal = formatearHorarioApertura(schedule_days);
    }

    await branch.update({
      name: name !== undefined ? name.trim() : branch.name,
      address: address !== undefined ? address.trim() : branch.address,
      city: city !== undefined ? city.trim() : branch.city,
      phone: phone !== undefined ? phone : branch.phone,
      email: email !== undefined ? email : branch.email,
      opening_hours: horarioFinal !== undefined ? horarioFinal : branch.opening_hours,
      schedule_days: schedule_days !== undefined ? schedule_days : branch.schedule_days,
      capacity: capacity !== undefined ? parseInt(capacity, 10) : branch.capacity,
      status: status !== undefined ? status : branch.status
    });

    return res.json({
      success: true,
      message: 'Branch actualizada exitosamente',
      branch
    });
  } catch (error) {
    console.error('Error al actualizar branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al actualizar la branch',
      detalles: error.message
    });
  }
};

// Baja lógica / Toggle de status de la branch
const toggleEstadoSede = async (req, res) => {
  const { id } = req.params;
  try {
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch no encontrada'
      });
    }

    const nuevoEstado = !branch.status;
    await branch.update({ status: nuevoEstado });

    return res.json({
      success: true,
      message: `Branch ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`,
      branch
    });
  } catch (error) {
    console.error('Error al cambiar status de la branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cambiar status de la branch',
      detalles: error.message
    });
  }
};

// Eliminar branch permanentemente
const eliminarSede = async (req, res) => {
  const { id } = req.params;
  try {
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch no encontrada'
      });
    }

    await branch.destroy();

    return res.json({
      success: true,
      message: 'Branch eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar branch:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar branch',
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
