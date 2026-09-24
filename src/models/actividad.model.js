const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Sede = require('./sede.model');
const Profesor = require('./profesor.model');

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
  },
  sede_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Sede,
      key: 'id'
    }
  },
  profesor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Profesor,
      key: 'id'
    }
  }
}, {
  tableName: 'actividades',
  timestamps: false
});

// Relaciones
Sede.hasMany(Actividad, { foreignKey: 'sede_id', as: 'actividades' });
Actividad.belongsTo(Sede, { foreignKey: 'sede_id', as: 'sede' });

Profesor.hasMany(Actividad, { foreignKey: 'profesor_id', as: 'actividades' });
Actividad.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });

module.exports = Actividad;
