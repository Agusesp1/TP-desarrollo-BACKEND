const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { hashPassword, comparePassword, isBcryptHash } = require('../utils/hash.util');

const User = sequelize.define('User', {
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
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  enrollment_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  category: {
    type: DataTypes.ENUM('Inicial', 'Medium', 'Premium'),
    defaultValue: 'Inicial'
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'teacher'),
    defaultValue: 'user'
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  resetPasswordToken: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  twoFactorCode: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  twoFactorCodeExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: false,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password && !isBcryptHash(user.password)) {
        user.password = await hashPassword(user.password);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password && !isBcryptHash(user.password)) {
        user.password = await hashPassword(user.password);
      }
    }
  }
});

// Método de instancia para verificar contraseña con soporte para migración de texto plano a bcrypt
User.prototype.validatePassword = async function (plainPassword) {
  if (!this.password || !plainPassword) return false;

  if (isBcryptHash(this.password)) {
    return await comparePassword(plainPassword, this.password);
  }

  // Retrocompatibilidad con contraseñas que hayan sido guardadas en texto plano
  if (this.password === plainPassword) {
    this.password = await hashPassword(plainPassword);
    await this.save();
    return true;
  }

  return false;
};

module.exports = User;

