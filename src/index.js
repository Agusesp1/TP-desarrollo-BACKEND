require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const emailRoutes = require('./routes/email.routes');
const sedeRoutes = require('./routes/sede.routes');
const profesorRoutes = require('./routes/profesor.routes');
const actividadRoutes = require('./routes/actividad.routes');
const turnoRoutes = require('./routes/turno.routes');
const adminRoutes = require('./routes/admin.routes');
const sequelize = require('./config/db');
const inicializarDatos = require('./config/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors()); // Permite peticiones desde el frontend de React
app.use(express.json()); // Parsea peticiones con cuerpo JSON

// Ruta de prueba inicial
app.get('/', (req, res) => {
  res.json({ mensaje: '¡El servidor Backend está funcionando correctamente con Sequelize ORM!' });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/sedes', sedeRoutes);
app.use('/api/profesores', profesorRoutes);
app.use('/api/actividades', actividadRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/admin', adminRoutes);

// Probar conexión a la base de datos con Sequelize e inicializar datos al iniciar el servidor
sequelize.authenticate()
  .then(async () => {
    console.log('✅ Conexión exitosa a la base de datos MySQL mediante Sequelize');
    await inicializarDatos();
  })
  .catch((error) => {
    console.warn('⚠️ No se pudo conectar a MySQL mediante Sequelize al iniciar:', error.message);
  });

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
