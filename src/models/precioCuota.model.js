const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PrecioCuota = sequelize.define('PrecioCuota', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  fecha_desde: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'precios_cuota',
  timestamps: false
});

module.exports = PrecioCuota;
