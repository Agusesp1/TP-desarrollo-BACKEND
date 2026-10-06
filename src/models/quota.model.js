const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');

const Quota = sequelize.define('Quota', {
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
  numero_quota: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  periodo: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  date_emision: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  date_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  date_limite_payment: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pendiente', 'en demora', 'no pagado', 'pagado'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  date_payment: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metodo_payment: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  receipt: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mp_payment_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mp_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  mp_preference_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'quotas',
  timestamps: false
});

// Relaciones
User.hasMany(Quota, { foreignKey: 'user_id', as: 'quotas' });
Quota.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = Quota;
