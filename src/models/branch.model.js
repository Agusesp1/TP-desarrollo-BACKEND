const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Córdoba'
  },
  phone: {
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
  opening_hours: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Lunes a Viernes 07:00 a 23:00 - Sábados 08:00 a 20:00'
  },
  schedule_days: {
    type: DataTypes.JSON,
    allowNull: true
  },
  capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 150
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'branches',
  timestamps: false
});

module.exports = Branch;
