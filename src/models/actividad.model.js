const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Actividad = sequelize.define('Actividad', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  duracion: {
    type: DataTypes.INTEGER, // Duración en minutos (ej: 45, 60)
    allowNull: false,
    defaultValue: 60
  },
  cupo: {
    type: DataTypes.INTEGER, // Capacidad / cupo máximo de participantes
    allowNull: false,
    defaultValue: 20
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'actividades',
  timestamps: false
});

module.exports = Actividad;
