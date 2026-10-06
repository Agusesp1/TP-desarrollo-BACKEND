const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Branch = require('./branch.model');
const Teacher = require('./teacher.model');

const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // Duración en minutos (ej: 45, 60)
    allowNull: false,
    defaultValue: 60
  },
  capacity: {
    type: DataTypes.INTEGER, // Capacity / capacity máximo de participantes
    allowNull: false,
    defaultValue: 20
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Branch,
      key: 'id'
    }
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Teacher,
      key: 'id'
    }
  }
}, {
  tableName: 'activities',
  timestamps: false
});

// Relaciones
Branch.hasMany(Activity, { foreignKey: 'branch_id', as: 'activities' });
Activity.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

Teacher.hasMany(Activity, { foreignKey: 'teacher_id', as: 'activities' });
Activity.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });

module.exports = Activity;
