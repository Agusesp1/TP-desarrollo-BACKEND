require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'tp_desarrollo_backend',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '4644',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // Puedes cambiar a console.log para debug
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: false // No crear createdAt / updatedAt automáticamente
    }
  }
);

module.exports = sequelize;
