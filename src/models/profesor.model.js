const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Sede = require('./sede.model');

const Profesor = sequelize.define('Profesor', {
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
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  telefono: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  especialidad: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Musculación'
  },
  turno: {
    type: DataTypes.ENUM('Mañana', 'Tarde', 'Noche', 'Rotativo'),
    defaultValue: 'Mañana'
  },
  sede_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Sede,
      key: 'id'
    }
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fecha_alta: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'profesores',
  timestamps: false
});

// Relaciones
Sede.hasMany(Profesor, { foreignKey: 'sede_id', as: 'profesores' });
Profesor.belongsTo(Sede, { foreignKey: 'sede_id', as: 'sede' });

module.exports = Profesor;
