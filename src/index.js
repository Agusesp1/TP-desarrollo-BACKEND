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
const rawOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL
].filter(Boolean);

const allowedOrigins = rawOrigins.flatMap((item) =>
  item.split(',').map((url) => url.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, ''))
).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite peticiones sin origen (como Postman, curl o peticiones servidor a servidor)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    const isExplicitlyAllowed = allowedOrigins.includes(cleanOrigin);
    // Permite automáticamente dominios de Render (*.onrender.com) y entornos locales
    const isRenderDomain = cleanOrigin.endsWith('.onrender.com');
    const isLocalhost = cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1');

    if (isExplicitlyAllowed || isRenderDomain || isLocalhost) {
      return callback(null, true);
    }

    console.warn(`⚠️ [CORS] Origen no autorizado: "${origin}". Orígenes configurados:`, allowedOrigins);
    return callback(null, false);
  },
  credentials: true
}));
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

// Middleware global de manejo de errores (debe ir después de todas las rutas)
const errorHandler = require('./middlewares/error.middleware');
app.use(errorHandler);

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
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor escuchando en http://${HOST}:${PORT}`);
});
