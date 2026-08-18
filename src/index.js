require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const emailRoutes = require('./routes/email.routes');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite peticiones desde el frontend de React
app.use(express.json()); // Parsea peticiones con cuerpo JSON

// Ruta de prueba inicial
app.get('/', (req, res) => {
  res.json({ mensaje: '¡El servidor Backend está funcionando correctamente!' });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/email', emailRoutes);


// Probar conexión a la base de datos al iniciar el servidor
pool.getConnection()
  .then((connection) => {
    console.log('✅ Conexión exitosa a la base de datos MySQL');
    connection.release();
  })
  .catch((error) => {
    console.warn('⚠️ No se pudo conectar a MySQL al iniciar. Asegúrate de iniciar MySQL y crear la BD:', error.message);
  });

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
