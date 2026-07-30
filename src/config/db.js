const mysql = require('mysql2/promise');
require('dotenv').config();

// Creamos un pool de conexiones (recomendado para aplicaciones web)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '4644',
  database: process.env.DB_NAME || 'tp_desarrollo_backend',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
