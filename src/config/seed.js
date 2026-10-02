const { Op } = require('sequelize');
const Usuario = require('../models/usuario.model');
const Sede = require('../models/sede.model');
const Profesor = require('../models/profesor.model');
const Actividad = require('../models/actividad.model');
const Turno = require('../models/turno.model');
const Reserva = require('../models/reserva.model');
const PrecioCuota = require('../models/precioCuota.model');
const Cuota = require('../models/cuota.model');
const cuotaService = require('../services/cuota.service');
const { isBcryptHash, hashPassword } = require('../utils/hash.util');
const sequelize = require('./db');

const inicializarDatos = async () => {
  try {
    // Sincronizar modelos con la base de datos (crea o actualiza tablas según sea necesario)
    await sequelize.sync();
    try {
      await sequelize.query('ALTER TABLE sedes ADD COLUMN horarios_dias JSON;');
      console.log('✅ Columna horarios_dias agregada a la tabla sedes.');
    } catch (error) {
      // Ignorar si la columna ya existe
    }
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
      const passwordValida = await adminExistente.validarPassword(adminPassword);
      if (adminExistente.rol !== 'admin' || !passwordValida) {
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

    // Asegurar que todos los profesores tengan su cuenta de Usuario con rol 'profesor' para poder ingresar
    for (const prof of profesores) {
      const userExistente = await Usuario.findOne({ where: { email: prof.email } });
      if (!userExistente) {
        await Usuario.create({
          nombre: prof.nombre,
          apellido: prof.apellido,
          dni: prof.dni,
          fecha_nacimiento: '1992-05-15',
          email: prof.email,
          password: prof.dni, // Contraseña por defecto es su DNI
          rol: 'profesor',
          bio: `Profesor oficial de ${prof.especialidad}.`,
          estado: true
        });
      } else if (userExistente.rol !== 'profesor') {
        await userExistente.update({ rol: 'profesor' });
      }
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
        sede_id: sedes[0] ? sedes[0].id : null,
        estado: true
      });
      console.log('✅ Actividad Musculación & Sala de Pesas creada con éxito.');
    } else if (!actMusculacion.sede_id && sedes[0]) {
      await actMusculacion.update({ sede_id: sedes[0].id });
    }

    const cantidadActividades = await Actividad.count();
    if (cantidadActividades <= 1) {
      await Actividad.bulkCreate([
        {
          nombre: 'Pilates Reformer',
          duracion: 50,
          cupo: 12,
          descripcion: 'Entrenamiento de fuerza, control postural y flexibilidad en camillas.',
          sede_id: sedes[0] ? sedes[0].id : null,
          estado: true
        },
        {
          nombre: 'Zumba Fitness',
          duracion: 60,
          cupo: 30,
          descripcion: 'Clase dinámica de baile y cardio al ritmo de la mejor música latina.',
          sede_id: sedes[1] ? sedes[1].id : null,
          estado: true
        },
        {
          nombre: 'Spinning Power',
          duracion: 45,
          cupo: 20,
          descripcion: 'Ciclismo indoor de alta intensidad con intervalos y pendientes simuladas.',
          sede_id: sedes[2] ? sedes[2].id : (sedes[0] ? sedes[0].id : null),
          estado: true
        },
        {
          nombre: 'Funcional & Cross Training',
          duracion: 60,
          cupo: 25,
          descripcion: 'Circuitos de fuerza metabólica, potencia y resistencia muscular.',
          sede_id: sedes[1] ? sedes[1].id : null,
          estado: true
        },
        {
          nombre: 'Yoga Vinyasa',
          duracion: 60,
          cupo: 18,
          descripcion: 'Secuencias dinámicas de respiración y posturas para calmar la mente y fortalecer el cuerpo.',
          sede_id: sedes[0] ? sedes[0].id : null,
          estado: true
        }
      ]);
      console.log('✅ Otras actividades iniciales pre-cargadas con éxito.');
    }

    const actividades = await Actividad.findAll();

    // Asignar profesores a cargo de las actividades si aún no tienen
    for (const act of actividades) {
      if (!act.profesor_id) {
        if (act.nombre.includes('Musculación')) {
          const p = profesores.find(pr => pr.especialidad.includes('Musculación')) || profesores[0];
          if (p) await act.update({ profesor_id: p.id });
        } else if (act.nombre.includes('Pilates') || act.nombre.includes('Yoga')) {
          const p = profesores.find(pr => pr.nombre === 'Camila') || profesores[0];
          if (p) await act.update({ profesor_id: p.id });
        } else if (act.nombre.includes('Zumba') || act.nombre.includes('Funcional')) {
          const p = profesores.find(pr => pr.nombre === 'Luciana') || profesores[1];
          if (p) await act.update({ profesor_id: p.id });
        } else if (act.nombre.includes('Spinning')) {
          const p = profesores.find(pr => pr.nombre === 'Matías') || profesores[2];
          if (p) await act.update({ profesor_id: p.id });
        }
      }
    }

    // 5. Pre-cargar Turnos organizados por combinación de días (Lun a Sáb) y rangos de 2hs
    const cantidadTurnos = await Turno.count();
    if (cantidadTurnos === 0) {
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
    }

    // 6. Pre-cargar PrecioCuota base si no existe
    const cantidadPrecios = await PrecioCuota.count();
    if (cantidadPrecios === 0) {
      await PrecioCuota.create({
        monto: 18000.00,
        fecha_desde: '2026-01-01',
        descripcion: 'Precio base de suscripción mensual 2026',
        activo: true
      });
      console.log('✅ Precio de cuota inicial ($18.000) configurado con éxito.');
    }

    // 7. Eliminar cualquier cuota que pudiera existir para usuarios cuyo rol !== 'usuario'
    const usuariosNoClientes = await Usuario.findAll({
      where: {
        rol: { [Op.ne]: 'usuario' }
      }
    });

    if (usuariosNoClientes.length > 0) {
      const idsNoClientes = usuariosNoClientes.map((u) => u.id);
      const cuotasEliminadas = await Cuota.destroy({
        where: {
          usuario_id: { [Op.in]: idsNoClientes }
        }
      });
      if (cuotasEliminadas > 0) {
        console.log(`🧹 Se eliminaron ${cuotasEliminadas} cuotas asignadas a usuarios no clientes (administradores o profesores).`);
      }
    }

    // 8. Solo generar cuotas iniciales para usuarios con rol === 'usuario'
    const clientes = await Usuario.findAll({
      where: { rol: 'usuario' }
    });
    for (const u of clientes) {
      const cantCuotas = await Cuota.count({ where: { usuario_id: u.id } });
      if (cantCuotas === 0) {
        // Usar su fecha_inscripcion o fecha actual/base
        await cuotaService.generarCuotasIniciales(u.id, u.fecha_inscripcion || new Date());
      } else {
        await cuotaService.actualizarEstadosCuotas(u.id);
      }
    }
    console.log('✅ Cuotas verificadas e inicializadas únicamente para clientes (socios).');

    // 9. Encriptar con bcrypt cualquier contraseña existente en la BD que aún esté en texto plano
    const todosLosUsuarios = await Usuario.findAll();
    let contrasenasMigradas = 0;
    for (const usuario of todosLosUsuarios) {
      if (usuario.password && !isBcryptHash(usuario.password)) {
        usuario.password = await hashPassword(usuario.password);
        await usuario.save();
        contrasenasMigradas++;
      }
    }
    if (contrasenasMigradas > 0) {
      console.log(`🔒 Se encriptaron con éxito las contraseñas de ${contrasenasMigradas} usuario(s) existentes en la base de datos.`);
    }

  } catch (error) {
    console.warn('⚠️ Error durante la inicialización de datos de seed:', error.message);
  }
};

module.exports = inicializarDatos;
