const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Actividad = require('./actividad.model');
const Profesor = require('./profesor.model');
const Sede = require('./sede.model');

const Turno = sequelize.define('Turno', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  actividad_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Actividad,
      key: 'id'
    }
  },
  horarioInicio: {
    type: DataTypes.STRING(10), // Ej: "08:00", "18:30"
    allowNull: false
  },
  horaFin: {
    type: DataTypes.STRING(10), // Ej: "09:00", "19:30"
    allowNull: false
  },
  dia_semana: {
    type: DataTypes.STRING(100), // Ej: "Lunes a Sábado", "Lunes a Viernes", "Lunes, Miércoles y Viernes", "Lunes"
    allowNull: false,
    defaultValue: 'Lunes a Sábado'
  },
  profesor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Profesor,
      key: 'id'
    }
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
  }
}, {
  tableName: 'turnos',
  timestamps: false
});

// Relaciones
Actividad.hasMany(Turno, { foreignKey: 'actividad_id', as: 'turnos' });
Turno.belongsTo(Actividad, { foreignKey: 'actividad_id', as: 'actividad' });

Profesor.hasMany(Turno, { foreignKey: 'profesor_id', as: 'turnos' });
Turno.belongsTo(Profesor, { foreignKey: 'profesor_id', as: 'profesor' });

Sede.hasMany(Turno, { foreignKey: 'sede_id', as: 'turnos' });
Turno.belongsTo(Sede, { foreignKey: 'sede_id', as: 'sede' });

module.exports = Turno;
