const db = require('../config/db');

// Función helper para asegurar tipos de datos correctos al retornar un usuario
const mapearUsuario = (usuario) => {
  if (!usuario) return null;
  return {
    ...usuario,
    estado: !!usuario.estado
  };
};

// Buscar usuario por correo electrónico
const buscarPorEmail = async (email) => {
  const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
  return mapearUsuario(rows[0]);
};

// Buscar usuario por correo excluyendo su propio ID (para actualizar perfil)
const buscarPorEmailExcluyendoId = async (email, id) => {
  const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ? AND id != ?', [email, id]);
  return mapearUsuario(rows[0]);
};

// Buscar usuario por DNI
const buscarPorDni = async (dni) => {
  const [rows] = await db.query('SELECT * FROM usuarios WHERE dni = ?', [dni]);
  return mapearUsuario(rows[0]);
};

// Buscar usuario por ID
const buscarPorId = async (id) => {
  const [rows] = await db.query(
    'SELECT id, nombre, apellido, dni, fecha_nacimiento, email, fecha_inscripcion, categoria, estado FROM usuarios WHERE id = ?',
    [id]
  );
  return mapearUsuario(rows[0]);
};

// Convertir fecha de DD/MM/YYYY a YYYY-MM-DD para MySQL DATE
const formatearFechaParaMySQL = (fechaStr) => {
  if (!fechaStr) return null;
  if (fechaStr.includes('/')) {
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const [dia, mes, anio] = partes;
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
  }
  return fechaStr;
};

// Crear un nuevo usuario en la base de datos
const crearUsuario = async (datosUsuario) => {
  const { nombre, apellido, dni, fechaNac, email, password } = datosUsuario;
  const fechaFormateada = formatearFechaParaMySQL(fechaNac);

  const sql = `
    INSERT INTO usuarios (nombre, apellido, dni, fecha_nacimiento, email, password)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [resultado] = await db.query(sql, [nombre, apellido, dni, fechaFormateada, email, password]);
  
  return {
    id: resultado.insertId,
    nombre,
    apellido,
    dni,
    fechaNac: fechaFormateada,
    email
  };
};

// Actualizar los datos del perfil del usuario (nombre, apellido, email, bio)
const actualizarPerfil = async (id, datosActualizados) => {
  const { nombre, apellido, email } = datosActualizados;
  
  const sql = `
    UPDATE usuarios 
    SET nombre = ?, apellido = ?, email = ?
    WHERE id = ?
  `;
  
  await db.query(sql, [nombre, apellido, email, id]);
  
  // Devolver el usuario actualizado
  return await buscarPorId(id);
};

// Actualizar la contraseña del usuario
const actualizarPassword = async (id, nuevaPassword) => {
  const sql = 'UPDATE usuarios SET password = ? WHERE id = ?';
  await db.query(sql, [nuevaPassword, id]);
  return true;
};

module.exports = {
  buscarPorEmail,
  buscarPorEmailExcluyendoId,
  buscarPorDni,
  buscarPorId,
  crearUsuario,
  actualizarPerfil,
  actualizarPassword
};
