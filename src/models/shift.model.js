const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Activity = require('./activity.model');
const Teacher = require('./teacher.model');
const Branch = require('./branch.model');

const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  activity_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Activity,
      key: 'id'
    }
  },
  startTime: {
    type: DataTypes.STRING(10), // Ej: "08:00", "18:30"
    allowNull: false
  },
  endTime: {
    type: DataTypes.STRING(10), // Ej: "09:00", "19:30"
    allowNull: false
  },
  dayOfWeek: {
    type: DataTypes.STRING(100), // Ej: "Lunes a Sábado", "Lunes a Viernes", "Lunes, Miércoles y Viernes", "Lunes"
    allowNull: false,
    defaultValue: 'Lunes a Sábado'
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Teacher,
      key: 'id'
    }
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Branch,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'shifts',
  timestamps: false
});

// Relaciones
Activity.hasMany(Shift, { foreignKey: 'activity_id', as: 'shifts' });
Shift.belongsTo(Activity, { foreignKey: 'activity_id', as: 'activity' });

Teacher.hasMany(Shift, { foreignKey: 'teacher_id', as: 'shifts' });
Shift.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

Branch.hasMany(Shift, { foreignKey: 'branch_id', as: 'shifts' });
Shift.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

module.exports = Shift;
