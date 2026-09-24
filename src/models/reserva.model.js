const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Usuario = require('./usuario.model');
const Turno = require('./turno.model');

const Reserva = sequelize.define('Reserva', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Usuario,
      key: 'id'
    }
  },
  turno_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Turno,
      key: 'id'
    }
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'confirmada' // 'confirmada' | 'cancelada'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'reservas',
  timestamps: false
});

// Relaciones
Usuario.hasMany(Reserva, { foreignKey: 'usuario_id', as: 'reservas' });
Reserva.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Turno.hasMany(Reserva, { foreignKey: 'turno_id', as: 'reservas' });
Reserva.belongsTo(Turno, { foreignKey: 'turno_id', as: 'turno' });

module.exports = Reserva;
