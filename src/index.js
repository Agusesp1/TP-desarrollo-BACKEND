require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const emailRoutes = require('./routes/email.routes');
const branchRoutes = require('./routes/branch.routes');
const teacherRoutes = require('./routes/teacher.routes');
const activityRoutes = require('./routes/activity.routes');
const shiftRoutes = require('./routes/shift.routes');
const reservationRoutes = require('./routes/reservation.routes');
const adminRoutes = require('./routes/admin.routes');
const quotaRoutes = require('./routes/quota.routes');
const paymentRoutes = require('./routes/payment.routes');
const sequelize = require('./config/db');
const initializeData = require('./config/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors()); // Permite peticiones desde el frontend de React
app.use(express.json()); // Parsea peticiones con cuerpo JSON

// Route de prueba inicial
app.get('/', (req, res) => {
  res.json({ message: '¡El servidor Backend está funcionando correctamente con Sequelize ORM!' });
});

// Routes de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quotas', quotaRoutes);
app.use('/api/payments', paymentRoutes);

// Probar conexión a la base de datos con Sequelize e inicializar datos al iniciar el servidor
sequelize.authenticate()
  .then(async () => {
    console.log('✅ Conexión exitosa a la base de datos MySQL mediante Sequelize');
    await initializeData();
  })
  .catch((error) => {
    console.warn('⚠️ No se pudo conectar a MySQL mediante Sequelize al iniciar:', error.message);
  });

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
