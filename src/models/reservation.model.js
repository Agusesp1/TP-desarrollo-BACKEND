const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Shift = require('./shift.model');

const Reservation = sequelize.define('Reservation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  shift_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Shift,
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'confirmada' // 'confirmada' | 'cancelada'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'reservations',
  timestamps: false
});

// Relaciones
User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Shift.hasMany(Reservation, { foreignKey: 'shift_id', as: 'reservations' });
Reservation.belongsTo(Shift, { foreignKey: 'shift_id', as: 'shift' });

module.exports = Reservation;
