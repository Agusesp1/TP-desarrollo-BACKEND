const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Sede = sequelize.define('Sede', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  ciudad: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Córdoba'
  },
  telefono: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  horario_apertura: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Lunes a Viernes 07:00 a 23:00 - Sábados 08:00 a 20:00'
  },
  capacidad: {
    type: DataTypes.INTEGER,
    defaultValue: 150
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'sedes',
  timestamps: false
});

module.exports = Sede;
