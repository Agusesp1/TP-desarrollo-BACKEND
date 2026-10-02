const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;
const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * Encripta una contraseña en texto plano utilizando bcryptjs.
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash encriptado
 */
const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('La contraseña debe ser una cadena de texto válida');
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compara una contraseña en texto plano con un hash almacenado.
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>} True si coinciden
 */
const comparePassword = async (password, hash) => {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
};

/**
 * Determina si una cadena ya tiene formato de hash bcrypt.
 * @param {string} str - Cadena a evaluar
 * @returns {boolean} True si es un hash bcrypt
 */
const isBcryptHash = (str) => {
  if (!str || typeof str !== 'string') return false;
  return BCRYPT_REGEX.test(str);
};

module.exports = {
  hashPassword,
  comparePassword,
  isBcryptHash
};
