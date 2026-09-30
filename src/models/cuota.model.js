const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Usuario = require('./usuario.model');

const Cuota = sequelize.define('Cuota', {
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
  numero_cuota: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  periodo: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  fecha_emision: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_limite_pago: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'en demora', 'no pagado', 'pagado'),
    allowNull: false,
    defaultValue: 'pendiente'
  },
  fecha_pago: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metodo_pago: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  comprobante: {
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
  tableName: 'cuotas',
  timestamps: false
});

// Relaciones
Usuario.hasMany(Cuota, { foreignKey: 'usuario_id', as: 'cuotas' });
Cuota.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

module.exports = Cuota;
