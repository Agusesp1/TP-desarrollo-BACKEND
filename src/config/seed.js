const Usuario = require('../models/usuario.model');
const Sede = require('../models/sede.model');
const Profesor = require('../models/profesor.model');
const Actividad = require('../models/actividad.model');
const Turno = require('../models/turno.model');
const sequelize = require('./db');

const inicializarDatos = async () => {
  try {
    // Sincronizar modelos con la base de datos (crea o actualiza tablas según sea necesario)
    await sequelize.sync({ alter: true });
    console.log('📦 Base de datos sincronizada correctamente.');

    // 1. Crear o asegurar usuario Administrador
    const adminEmail = process.env.ADMIN_EMAIL || 'administraciongymfit@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminfit';

    const adminExistente = await Usuario.findOne({ where: { email: adminEmail } });

    if (!adminExistente) {
      await Usuario.create({
        nombre: 'Administrador',
        apellido: 'GymFit',
        dni: '00000001',
        fecha_nacimiento: '1990-01-01',
        email: adminEmail,
        password: adminPassword,
        bio: 'Administrador general de la plataforma FitApp Premium.',
        categoria: 'Premium',
        rol: 'admin',
        estado: true
      });
      console.log(`✅ Usuario Administrador pre-cargado con éxito (${adminEmail})`);
    } else {
      if (adminExistente.rol !== 'admin' || adminExistente.password !== adminPassword) {
        await adminExistente.update({
          rol: 'admin',
          password: adminPassword,
          estado: true
        });
        console.log('✅ Usuario Administrador actualizado a rol admin.');
      }
    }

    // 2. Pre-cargar Sedes iniciales si no hay ninguna
    const cantidadSedes = await Sede.count();
    let sedes = await Sede.findAll();
    if (cantidadSedes === 0) {
      sedes = await Sede.bulkCreate([
        {
          nombre: 'FitApp Sede Centro',
          direccion: 'Av. Colón 850',
          ciudad: 'Córdoba Capital',
          telefono: '+54 9 351 445-1234',
          email: 'centro@gymfit.com',
          horario_apertura: '07:00 a 23:00 hs',
          capacidad: 250,
          estado: true
        },
        {
          nombre: 'FitApp Sede Nueva Córdoba',
          direccion: 'Av. Hipólito Yrigoyen 320',
          ciudad: 'Córdoba Capital',
          telefono: '+54 9 351 556-7890',
          email: 'nuevacordoba@gymfit.com',
          horario_apertura: '06:30 a 23:30 hs',
          capacidad: 300,
          estado: true
        },
        {
          nombre: 'FitApp Sede Cerro de las Rosas',
          direccion: 'Av. Rafael Núñez 4200',
          ciudad: 'Córdoba Capital',
          telefono: '+54 9 351 667-4321',
          email: 'cerro@gymfit.com',
          horario_apertura: '07:00 a 22:30 hs',
          capacidad: 200,
          estado: true
        }
      ]);
      console.log('✅ Sedes iniciales pre-cargadas con éxito.');
    }

    // 3. Pre-cargar Profesores iniciales
    const cantidadProfesores = await Profesor.count();
    let profesores = await Profesor.findAll();
    if (cantidadProfesores === 0 && sedes.length > 0) {
      profesores = await Profesor.bulkCreate([
        {
          nombre: 'Rodrigo',
          apellido: 'González',
          dni: '38123456',
          email: 'rodrigo.gonzalez@gymfit.com',
          telefono: '+54 9 351 611-2233',
          especialidad: 'Musculación & Hipertrofia',
          turno: 'Mañana',
          sede_id: sedes[0].id,
          estado: true
        },
        {
          nombre: 'Luciana',
          apellido: 'Martínez',
          dni: '39456789',
          email: 'luciana.martinez@gymfit.com',
          telefono: '+54 9 351 622-3344',
          especialidad: 'Crossfit & Funcional',
          turno: 'Tarde',
          sede_id: sedes[1].id,
          estado: true
        },
        {
          nombre: 'Matías',
          apellido: 'Fernández',
          dni: '37890123',
          email: 'matias.fernandez@gymfit.com',
          telefono: '+54 9 351 633-4455',
          especialidad: 'Spinning & Cardio',
          turno: 'Noche',
          sede_id: sedes[2].id,
          estado: true
        },
        {
          nombre: 'Camila',
          apellido: 'Benítez',
          dni: '40112233',
          email: 'camila.benitez@gymfit.com',
          telefono: '+54 9 351 644-5566',
          especialidad: 'Yoga & Pilates',
          turno: 'Mañana',
          sede_id: sedes[0].id,
          estado: true
        }
      ]);
      console.log('✅ Profesores iniciales pre-cargados con éxito.');
    }

    // 4. Pre-cargar Actividades (incluyendo Musculación)
    let actMusculacion = await Actividad.findOne({
      where: { nombre: 'Musculación & Sala de Pesas' }
    });

    if (!actMusculacion) {
      actMusculacion = await Actividad.create({
        nombre: 'Musculación & Sala de Pesas',
        duracion: 60,
        cupo: 40,
        descripcion: 'Entrenamiento libre y guiado de fuerza, hipertrofia y acondicionamiento físico con pesas y máquinas.',
        estado: true
      });
      console.log('✅ Actividad Musculación & Sala de Pesas creada con éxito.');
    }

    const cantidadActividades = await Actividad.count();
    if (cantidadActividades <= 1) {
      await Actividad.bulkCreate([
        {
          nombre: 'Pilates Reformer',
          duracion: 50,
          cupo: 12,
          descripcion: 'Entrenamiento de fuerza, control postural y flexibilidad en camillas.',
          estado: true
        },
        {
          nombre: 'Zumba Fitness',
          duracion: 60,
          cupo: 30,
          descripcion: 'Clase dinámica de baile y cardio al ritmo de la mejor música latina.',
          estado: true
        },
        {
          nombre: 'Spinning Power',
          duracion: 45,
          cupo: 20,
          descripcion: 'Ciclismo indoor de alta intensidad con intervalos y pendientes simuladas.',
          estado: true
        },
        {
          nombre: 'Funcional & Cross Training',
          duracion: 60,
          cupo: 25,
          descripcion: 'Circuitos de fuerza metabólica, potencia y resistencia muscular.',
          estado: true
        },
        {
          nombre: 'Yoga Vinyasa',
          duracion: 60,
          cupo: 18,
          descripcion: 'Secuencias dinámicas de respiración y posturas para calmar la mente y fortalecer el cuerpo.',
          estado: true
        }
      ]);
      console.log('✅ Otras actividades iniciales pre-cargadas con éxito.');
    }

    const actividades = await Actividad.findAll();

    // 5. Pre-cargar Turnos organizados por combinación de días (Lun a Sáb) y rangos de 2hs
    // Limpiamos turnos previos para aplicar la nueva estructura limpia
    await Turno.destroy({ where: {} });

    const profRodrigo = profesores.find(p => p.especialidad.includes('Musculación')) || profesores[0];
    const profCamila = profesores.find(p => p.nombre === 'Camila') || profesores[0];
    const profLuciana = profesores.find(p => p.nombre === 'Luciana') || profesores[1];
    const profMatias = profesores.find(p => p.nombre === 'Matías') || profesores[2];

    const sede1 = sedes[0] ? sedes[0].id : null;
    const sede2 = sedes[1] ? sedes[1].id : null;
    const sede3 = sedes[2] ? sedes[2].id : null;

    const turnosIniciales = [
      // Musculación & Sala de Pesas (Lunes a Sábado con bloques de 2 horas)
      { actividad_id: actMusculacion.id, horarioInicio: '07:00', horaFin: '09:00', dia_semana: 'Lunes a Sábado', profesor_id: profRodrigo?.id, sede_id: sede1, estado: true },
      { actividad_id: actMusculacion.id, horarioInicio: '09:00', horaFin: '11:00', dia_semana: 'Lunes a Sábado', profesor_id: profRodrigo?.id, sede_id: sede1, estado: true },
      { actividad_id: actMusculacion.id, horarioInicio: '11:00', horaFin: '13:00', dia_semana: 'Lunes a Sábado', profesor_id: profRodrigo?.id, sede_id: sede1, estado: true },
      { actividad_id: actMusculacion.id, horarioInicio: '14:00', horaFin: '16:00', dia_semana: 'Lunes a Sábado', profesor_id: profRodrigo?.id, sede_id: sede1, estado: true },
      { actividad_id: actMusculacion.id, horarioInicio: '16:00', horaFin: '18:00', dia_semana: 'Lunes a Sábado', profesor_id: profRodrigo?.id, sede_id: sede1, estado: true },
      { actividad_id: actMusculacion.id, horarioInicio: '18:00', horaFin: '20:00', dia_semana: 'Lunes a Sábado', profesor_id: profRodrigo?.id, sede_id: sede1, estado: true },
      { actividad_id: actMusculacion.id, horarioInicio: '20:00', horaFin: '22:00', dia_semana: 'Lunes a Sábado', profesor_id: profRodrigo?.id, sede_id: sede1, estado: true },
      { actividad_id: actMusculacion.id, horarioInicio: '21:00', horaFin: '23:00', dia_semana: 'Lunes a Viernes', profesor_id: profRodrigo?.id, sede_id: sede1, estado: true },
    ];

    // Turnos de otras actividades con rangos de 2hs y combinación de días
    const actPilates = actividades.find(a => a.nombre.includes('Pilates'));
    const actZumba = actividades.find(a => a.nombre.includes('Zumba'));
    const actSpinning = actividades.find(a => a.nombre.includes('Spinning'));
    const actFuncional = actividades.find(a => a.nombre.includes('Funcional'));
    const actYoga = actividades.find(a => a.nombre.includes('Yoga'));

    if (actPilates) {
      turnosIniciales.push(
        { actividad_id: actPilates.id, horarioInicio: '08:00', horaFin: '10:00', dia_semana: 'Lunes, Miércoles y Viernes', profesor_id: profCamila?.id, sede_id: sede1, estado: true },
        { actividad_id: actPilates.id, horarioInicio: '16:00', horaFin: '18:00', dia_semana: 'Martes y Jueves', profesor_id: profCamila?.id, sede_id: sede1, estado: true }
      );
    }

    if (actZumba) {
      turnosIniciales.push(
        { actividad_id: actZumba.id, horarioInicio: '18:00', horaFin: '20:00', dia_semana: 'Martes y Jueves', profesor_id: profLuciana?.id, sede_id: sede2, estado: true },
        { actividad_id: actZumba.id, horarioInicio: '10:00', horaFin: '12:00', dia_semana: 'Sábados', profesor_id: profLuciana?.id, sede_id: sede2, estado: true }
      );
    }

    if (actSpinning) {
      turnosIniciales.push(
        { actividad_id: actSpinning.id, horarioInicio: '19:00', horaFin: '21:00', dia_semana: 'Lunes, Miércoles y Viernes', profesor_id: profMatias?.id, sede_id: sede3 || sede1, estado: true }
      );
    }

    if (actFuncional) {
      turnosIniciales.push(
        { actividad_id: actFuncional.id, horarioInicio: '08:00', horaFin: '10:00', dia_semana: 'Martes y Jueves', profesor_id: profLuciana?.id, sede_id: sede2, estado: true }
      );
    }

    if (actYoga) {
      turnosIniciales.push(
        { actividad_id: actYoga.id, horarioInicio: '09:00', horaFin: '11:00', dia_semana: 'Sábados', profesor_id: profCamila?.id, sede_id: sede1, estado: true }
      );
    }

    await Turno.bulkCreate(turnosIniciales);
    console.log(`✅ ${turnosIniciales.length} turnos configurados con combinaciones de días (Lun a Sáb) y rangos de 2hs creados con éxito.`);

  } catch (error) {
    console.warn('⚠️ Error durante la inicialización de datos de seed:', error.message);
  }
};

module.exports = inicializarDatos;
