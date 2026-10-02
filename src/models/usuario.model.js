const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { hashPassword, comparePassword, isBcryptHash } = require('../utils/hash.util');

const Usuario = sequelize.define('Usuario', {
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
  fecha_nacimiento: {
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
  fecha_inscripcion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  categoria: {
    type: DataTypes.ENUM('Inicial', 'Medium', 'Premium'),
    defaultValue: 'Inicial'
  },
  rol: {
    type: DataTypes.ENUM('admin', 'usuario', 'profesor'),
    defaultValue: 'usuario'
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'usuarios',
  timestamps: false,
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.password && !isBcryptHash(usuario.password)) {
        usuario.password = await hashPassword(usuario.password);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('password') && usuario.password && !isBcryptHash(usuario.password)) {
        usuario.password = await hashPassword(usuario.password);
      }
    }
  }
});

// Método de instancia para verificar contraseña con soporte para migración de texto plano a bcrypt
Usuario.prototype.validarPassword = async function (plainPassword) {
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

module.exports = Usuario;

