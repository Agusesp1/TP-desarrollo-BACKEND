const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  dni: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  fecha_nacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fecha_inscripcion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  categoria: {
    type: DataTypes.ENUM('Inicial', 'Medium', 'Premium'),
    defaultValue: 'Inicial'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'usuarios',
  timestamps: false
});

module.exports = Usuario;
