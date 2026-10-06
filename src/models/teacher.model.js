const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Branch = require('./branch.model');

const Teacher = sequelize.define('Teacher', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  lastname: {
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
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  specialty: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Musculación'
  },
  shift: {
    type: DataTypes.ENUM('Mañana', 'Tarde', 'Noche', 'Rotativo'),
    defaultValue: 'Mañana'
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
  },
  date_alta: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'teachers',
  timestamps: false
});

// Relaciones
Branch.hasMany(Teacher, { foreignKey: 'branch_id', as: 'teachers' });
Teacher.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

module.exports = Teacher;
