require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const emailRoutes = require('./routes/email.routes');
const sequelize = require('./config/db');

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

// Probar conexión a la base de datos con Sequelize al iniciar el servidor
sequelize.authenticate()
  .then(() => {
    console.log('✅ Conexión exitosa a la base de datos MySQL mediante Sequelize');
  })
  .catch((error) => {
    console.warn('⚠️ No se pudo conectar a MySQL mediante Sequelize al iniciar:', error.message);
  });

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
