const { Op } = require('sequelize');
const User = require('../models/user.model');
const Branch = require('../models/branch.model');
const Teacher = require('../models/teacher.model');
const Activity = require('../models/activity.model');
const Shift = require('../models/shift.model');
const Reservation = require('../models/reservation.model');
const PriceCuota = require('../models/priceCuota.model');
const Quota = require('../models/quota.model');
const quotaService = require('../services/quota.service');
const { isBcryptHash, hashPassword } = require('../utils/hash.util');
const sequelize = require('./db');

const initializeData = async () => {
  try {
    // Sincronizar modelos con la base de datos (crea o actualiza tablas según sea necesario)
    await sequelize.sync({ alter: true });
    try {
      await sequelize.query('ALTER TABLE branches ADD COLUMN schedule_days JSON;');
      console.log('✅ Columna schedule_days agregada a la tabla branches.');
    } catch (error) {
      // Ignorar si la columna ya existe
    }
    console.log('📦 Base de datos sincronizada correctamente.');

    
    // Verificar todos los usuarios existentes por defecto (migración)
    await User.update({ isEmailVerified: true }, { where: { isEmailVerified: false } });

    // 1. Crear o asegurar user Administrador
    const adminEmail = process.env.ADMIN_EMAIL || 'administraciongymfit@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminfit';

    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      await User.create({
        name: 'Administrador',
        lastname: 'GymFit',
        dni: '00000001',
        birth_date: '1990-01-01',
        email: adminEmail,
        password: adminPassword,
        bio: 'Administrador general de la plataforma FitApp Premium.',
        category: 'Premium',
        role: 'admin',
        status: true
      });
      console.log(`✅ User Administrador pre-cargado con éxito (${adminEmail})`);
    } else {
      const validPassword = await existingAdmin.validatePassword(adminPassword);
      if (existingAdmin.role !== 'admin' || !validPassword) {
        await existingAdmin.update({
          role: 'admin',
          password: adminPassword,
          status: true
        });
        console.log('✅ User Administrador actualizado a role admin.');
      }
    }

    // 2. Pre-cargar Branches iniciales si no hay ninguna
    const amountBranches = await Branch.count();
    let branches = await Branch.findAll();
    if (amountBranches === 0) {
      branches = await Branch.bulkCreate([
        {
          name: 'FitApp Branch Centro',
          address: 'Av. Colón 850',
          city: 'Córdoba Capital',
          phone: '+54 9 351 445-1234',
          email: 'centro@gymfit.com',
          opening_hours: '07:00 a 23:00 hs',
          capacity: 250,
          status: true
        },
        {
          name: 'FitApp Branch Nueva Córdoba',
          address: 'Av. Hipólito Yrigoyen 320',
          city: 'Córdoba Capital',
          phone: '+54 9 351 556-7890',
          email: 'nuevacordoba@gymfit.com',
          opening_hours: '06:30 a 23:30 hs',
          capacity: 300,
          status: true
        },
        {
          name: 'FitApp Branch Cerro de las Rosas',
          address: 'Av. Rafael Núñez 4200',
          city: 'Córdoba Capital',
          phone: '+54 9 351 667-4321',
          email: 'cerro@gymfit.com',
          opening_hours: '07:00 a 22:30 hs',
          capacity: 200,
          status: true
        }
      ]);
      console.log('✅ Branches iniciales pre-cargadas con éxito.');
    }

    // 3. Pre-cargar Teachers iniciales
    const amountTeachers = await Teacher.count();
    let teachers = await Teacher.findAll();
    if (amountTeachers === 0 && branches.length > 0) {
      teachers = await Teacher.bulkCreate([
        {
          name: 'Rodrigo',
          lastname: 'González',
          dni: '38123456',
          email: 'rodrigo.gonzalez@gymfit.com',
          phone: '+54 9 351 611-2233',
          specialty: 'Musculación & Hipertrofia',
          shift: 'Mañana',
          branch_id: branches[0].id,
          status: true
        },
        {
          name: 'Luciana',
          lastname: 'Martínez',
          dni: '39456789',
          email: 'luciana.martinez@gymfit.com',
          phone: '+54 9 351 622-3344',
          specialty: 'Crossfit & Funcional',
          shift: 'Tarde',
          branch_id: branches[1].id,
          status: true
        },
        {
          name: 'Matías',
          lastname: 'Fernández',
          dni: '37890123',
          email: 'matias.fernandez@gymfit.com',
          phone: '+54 9 351 633-4455',
          specialty: 'Spinning & Cardio',
          shift: 'Noche',
          branch_id: branches[2].id,
          status: true
        },
        {
          name: 'Camila',
          lastname: 'Benítez',
          dni: '40112233',
          email: 'camila.benitez@gymfit.com',
          phone: '+54 9 351 644-5566',
          specialty: 'Yoga & Pilates',
          shift: 'Mañana',
          branch_id: branches[0].id,
          status: true
        }
      ]);
      console.log('✅ Teachers iniciales pre-cargados con éxito.');
    }

    // Asegurar que todos los teachers tengan su cuenta de User con role 'teacher' para poder ingresar
    for (const teacher of teachers) {
      const userExistente = await User.findOne({ where: { email: teacher.email } });
      if (!userExistente) {
        await User.create({
          name: teacher.name,
          lastname: teacher.lastname,
          dni: teacher.dni,
          birth_date: '1992-05-15',
          email: teacher.email,
          password: teacher.dni, // Contraseña por defecto es su DNI
          role: 'teacher',
          bio: `Teacher oficial de ${teacher.specialty}.`,
          status: true
        });
      } else if (userExistente.role !== 'teacher') {
        await userExistente.update({ role: 'teacher' });
      }
    }

    // 4. Pre-cargar Activities (incluyendo Musculación)
    let actMuscle = await Activity.findOne({
      where: { name: 'Musculación & Sala de Pesas' }
    });

    if (!actMuscle) {
      actMuscle = await Activity.create({
        name: 'Musculación & Sala de Pesas',
        duration: 60,
        capacity: 40,
        description: 'Training libre y guiado de fuerza, hipertrofia y acondicionamiento físico con pesas y máquinas.',
        branch_id: branches[0] ? branches[0].id : null,
        status: true
      });
      console.log('✅ Activity Musculación & Sala de Pesas creada con éxito.');
    } else if (!actMuscle.branch_id && branches[0]) {
      await actMuscle.update({ branch_id: branches[0].id });
    }

    const amountActivities = await Activity.count();
    if (amountActivities <= 1) {
      await Activity.bulkCreate([
        {
          name: 'Pilates Reformer',
          duration: 50,
          capacity: 12,
          description: 'Training de fuerza, control postural y flexibilidad en camillas.',
          branch_id: branches[0] ? branches[0].id : null,
          status: true
        },
        {
          name: 'Zumba Fitness',
          duration: 60,
          capacity: 30,
          description: 'Clase dinámica de baile y cardio al ritmo de la mejor música latina.',
          branch_id: branches[1] ? branches[1].id : null,
          status: true
        },
        {
          name: 'Spinning Power',
          duration: 45,
          capacity: 20,
          description: 'Ciclismo indoor de alta intensidad con intervalos y pendientes simuladas.',
          branch_id: branches[2] ? branches[2].id : (branches[0] ? branches[0].id : null),
          status: true
        },
        {
          name: 'Funcional & Cross Training',
          duration: 60,
          capacity: 25,
          description: 'Circuitos de fuerza metabólica, potencia y resistencia muscular.',
          branch_id: branches[1] ? branches[1].id : null,
          status: true
        },
        {
          name: 'Yoga Vinyasa',
          duration: 60,
          capacity: 18,
          description: 'Secuencias dinámicas de respiración y posturas para calmar la mente y fortalecer el cuerpo.',
          branch_id: branches[0] ? branches[0].id : null,
          status: true
        }
      ]);
      console.log('✅ Otras activities iniciales pre-cargadas con éxito.');
    }

    const activities = await Activity.findAll();

    // Asignar teachers a cargo de las activities si aún no tienen
    for (const act of activities) {
      if (!act.teacher_id) {
        if (act.name.includes('Musculación')) {
          const p = teachers.find(pr => pr.specialty.includes('Musculación')) || teachers[0];
          if (p) await act.update({ teacher_id: p.id });
        } else if (act.name.includes('Pilates') || act.name.includes('Yoga')) {
          const p = teachers.find(pr => pr.name === 'Camila') || teachers[0];
          if (p) await act.update({ teacher_id: p.id });
        } else if (act.name.includes('Zumba') || act.name.includes('Funcional')) {
          const p = teachers.find(pr => pr.name === 'Luciana') || teachers[1];
          if (p) await act.update({ teacher_id: p.id });
        } else if (act.name.includes('Spinning')) {
          const p = teachers.find(pr => pr.name === 'Matías') || teachers[2];
          if (p) await act.update({ teacher_id: p.id });
        }
      }
    }

    // 5. Pre-cargar Shifts organizados por combinación de días (Lun a Sáb) y rangos de 2hs
    const amountShifts = await Shift.count();
    if (amountShifts === 0) {
      const profRodrigo = teachers.find(p => p.specialty.includes('Musculación')) || teachers[0];
      const profCamila = teachers.find(p => p.name === 'Camila') || teachers[0];
      const profLuciana = teachers.find(p => p.name === 'Luciana') || teachers[1];
      const profMatias = teachers.find(p => p.name === 'Matías') || teachers[2];

      const branch1 = branches[0] ? branches[0].id : null;
      const branch2 = branches[1] ? branches[1].id : null;
      const branch3 = branches[2] ? branches[2].id : null;

      const initialShifts = [
        // Musculación & Sala de Pesas (Lunes a Sábado con bloques de 2 horas)
        { activity_id: actMuscle.id, startTime: '07:00', endTime: '09:00', dayOfWeek: 'Lunes a Sábado', teacher_id: profRodrigo?.id, branch_id: branch1, status: true },
        { activity_id: actMuscle.id, startTime: '09:00', endTime: '11:00', dayOfWeek: 'Lunes a Sábado', teacher_id: profRodrigo?.id, branch_id: branch1, status: true },
        { activity_id: actMuscle.id, startTime: '11:00', endTime: '13:00', dayOfWeek: 'Lunes a Sábado', teacher_id: profRodrigo?.id, branch_id: branch1, status: true },
        { activity_id: actMuscle.id, startTime: '14:00', endTime: '16:00', dayOfWeek: 'Lunes a Sábado', teacher_id: profRodrigo?.id, branch_id: branch1, status: true },
        { activity_id: actMuscle.id, startTime: '16:00', endTime: '18:00', dayOfWeek: 'Lunes a Sábado', teacher_id: profRodrigo?.id, branch_id: branch1, status: true },
        { activity_id: actMuscle.id, startTime: '18:00', endTime: '20:00', dayOfWeek: 'Lunes a Sábado', teacher_id: profRodrigo?.id, branch_id: branch1, status: true },
        { activity_id: actMuscle.id, startTime: '20:00', endTime: '22:00', dayOfWeek: 'Lunes a Sábado', teacher_id: profRodrigo?.id, branch_id: branch1, status: true },
        { activity_id: actMuscle.id, startTime: '21:00', endTime: '23:00', dayOfWeek: 'Lunes a Viernes', teacher_id: profRodrigo?.id, branch_id: branch1, status: true },
      ];

      // Shifts de otras activities con rangos de 2hs y combinación de días
      const actPilates = activities.find(a => a.name.includes('Pilates'));
      const actZumba = activities.find(a => a.name.includes('Zumba'));
      const actSpinning = activities.find(a => a.name.includes('Spinning'));
      const actFuncional = activities.find(a => a.name.includes('Funcional'));
      const actYoga = activities.find(a => a.name.includes('Yoga'));

      if (actPilates) {
        initialShifts.push(
          { activity_id: actPilates.id, startTime: '08:00', endTime: '10:00', dayOfWeek: 'Lunes, Miércoles y Viernes', teacher_id: profCamila?.id, branch_id: branch1, status: true },
          { activity_id: actPilates.id, startTime: '16:00', endTime: '18:00', dayOfWeek: 'Martes y Jueves', teacher_id: profCamila?.id, branch_id: branch1, status: true }
        );
      }

      if (actZumba) {
        initialShifts.push(
          { activity_id: actZumba.id, startTime: '18:00', endTime: '20:00', dayOfWeek: 'Martes y Jueves', teacher_id: profLuciana?.id, branch_id: branch2, status: true },
          { activity_id: actZumba.id, startTime: '10:00', endTime: '12:00', dayOfWeek: 'Sábados', teacher_id: profLuciana?.id, branch_id: branch2, status: true }
        );
      }

      if (actSpinning) {
        initialShifts.push(
          { activity_id: actSpinning.id, startTime: '19:00', endTime: '21:00', dayOfWeek: 'Lunes, Miércoles y Viernes', teacher_id: profMatias?.id, branch_id: branch3 || branch1, status: true }
        );
      }

      if (actFuncional) {
        initialShifts.push(
          { activity_id: actFuncional.id, startTime: '08:00', endTime: '10:00', dayOfWeek: 'Martes y Jueves', teacher_id: profLuciana?.id, branch_id: branch2, status: true }
        );
      }

      if (actYoga) {
        initialShifts.push(
          { activity_id: actYoga.id, startTime: '09:00', endTime: '11:00', dayOfWeek: 'Sábados', teacher_id: profCamila?.id, branch_id: branch1, status: true }
        );
      }

      await Shift.bulkCreate(initialShifts);
      console.log(`✅ ${initialShifts.length} shifts configurados con combinaciones de días (Lun a Sáb) y rangos de 2hs creados con éxito.`);
    }

    // 6. Pre-cargar PriceCuota base si no existe
    const amountPrices = await PriceCuota.count();
    if (amountPrices === 0) {
      await PriceCuota.create({
        amount: 18000.00,
        start_date: '2026-01-01',
        description: 'Price base de suscripción mensual 2026',
        active: true
      });
      console.log('✅ Price de quota inicial ($18.000) configurado con éxito.');
    }

    // 7. Eliminar cualquier quota que pudiera existir para users cuyo role !== 'user'
    const usersNotMembers = await User.findAll({
      where: {
        role: { [Op.ne]: 'user' }
      }
    });

    if (usersNotMembers.length > 0) {
      const idsNotMembers = usersNotMembers.map((u) => u.id);
      const deletedQuotas = await Quota.destroy({
        where: {
          user_id: { [Op.in]: idsNotMembers }
        }
      });
      if (deletedQuotas > 0) {
        console.log(`🧹 Se eliminaron ${deletedQuotas} quotas asignadas a users no clients (administradores o teachers).`);
      }
    }

    // 8. Solo generar quotas iniciales para users con role === 'user'
    const clients = await User.findAll({
      where: { role: 'user' }
    });
    for (const u of clients) {
      const amountQuotas = await Quota.count({ where: { user_id: u.id } });
      if (amountQuotas === 0) {
        // Usar su enrollment_date o date actual/base
        await quotaService.generateInitialQuotas(u.id, u.enrollment_date || new Date());
      } else {
        await quotaService.updateQuotasStatuses(u.id);
      }
    }
    console.log('✅ Quotas verificadas e inicializadas únicamente para clients (members).');

    // 9. Encriptar con bcrypt cualquier contraseña existente en la BD que aún esté en texto plano
    const allUsers = await User.findAll();
    let migratedPasswords = 0;
    for (const user of allUsers) {
      if (user.password && !isBcryptHash(user.password)) {
        user.password = await hashPassword(user.password);
        await user.save();
        migratedPasswords++;
      }
    }
    if (migratedPasswords > 0) {
      console.log(`🔒 Se encriptaron con éxito las contraseñas de ${migratedPasswords} user(s) existentes en la base de datos.`);
    }

  } catch (error) {
    console.warn('⚠️ Error durante la inicialización de datos de seed:', error.message);
  }
};

module.exports = initializeData;
