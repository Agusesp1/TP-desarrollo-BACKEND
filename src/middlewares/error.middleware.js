/**
 * Middleware global de manejo de errores.
 * Captura cualquier excepción no controlada en controladores y middlewares,
 * imprime el detalle técnico completo en la consola del servidor para depuración
 * y responde al cliente con un código HTTP apropiado y un mensaje amigable en español.
 */
const errorHandler = (err, req, res, next) => {
  // 1. Registro técnico detallado en consola del backend
  console.error('\n🔴 [ERROR NO CONTROLADO EN BACKEND]');
  console.error(`🕒 Timestamp: ${new Date().toISOString()}`);
  console.error(`📍 Ruta: ${req.method} ${req.originalUrl}`);
  console.error(`🏷️ Nombre de Error: ${err.name || 'Error'}`);
  console.error(`💬 Mensaje: ${err.message || 'Sin mensaje'}`);
  if (err.parent) {
    console.error(`🗄️ SQL Error Code: ${err.parent.code} (${err.parent.errno})`);
    console.error(`📄 SQL Message: ${err.parent.sqlMessage}`);
    if (err.parent.sql) console.error(`📝 Query: ${err.parent.sql}`);
  }
  if (err.stack) {
    console.error(`📚 Stack Trace:\n${err.stack}`);
  }
  console.error('───────────────────────────────────────────────────────\n');

  // 2. Mapeo a respuestas amigables según el tipo de error
  let statusCode = err.statusCode || err.status || 500;
  let friendlyMessage = 'Ocurrió un inconveniente inesperado en el servidor. Por favor, intentá nuevamente más tarde.';

  // Errores de conexión o caída de la base de datos MySQL
  if (
    err.name === 'SequelizeConnectionError' ||
    err.name === 'SequelizeConnectionRefusedError' ||
    err.name === 'SequelizeHostNotFoundError' ||
    err.name === 'SequelizeHostNotReachableError' ||
    err.name === 'SequelizeInvalidConnectionError' ||
    err.name === 'SequelizeConnectionTimedOutError' ||
    err.code === 'ECONNREFUSED' ||
    err.code === 'ETIMEDOUT' ||
    err.code === 'PROTOCOL_CONNECTION_LOST'
  ) {
    statusCode = 503;
    friendlyMessage = 'En este momento no pudimos conectar con la base de datos. Por favor, intentá nuevamente en unos instantes.';
  }
  // Error de clave única duplicada en BD (fallback)
  else if (err.name === 'SequelizeUniqueConstraintError' || err.parent?.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    friendlyMessage = 'Los datos ingresados ya se encuentran registrados en el sistema. Verificá que no estén duplicados.';
  }
  // Error de clave foránea / integridad referencial en BD (fallback)
  else if (err.name === 'SequelizeForeignKeyConstraintError' || err.parent?.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 400;
    friendlyMessage = 'No se puede completar la operación porque este registro está vinculado a otros datos activos del gimnasio.';
  }
  // Error de validación de modelo Sequelize
  else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    const primerError = err.errors?.[0]?.message;
    friendlyMessage = primerError || 'Algunos de los datos proporcionados no cumplen con el formato requerido.';
  }
  // Si el error ya tenía un mensaje explícito definido de negocio
  else if (err.isFriendly && err.message) {
    friendlyMessage = err.message;
  }

  return res.status(statusCode).json({
    success: false,
    message: friendlyMessage,
    // Se incluye errorCode para trazabilidad en desarrollo sin exponer SQL al usuario
    errorCode: err.name || 'INTERNAL_ERROR'
  });
};

module.exports = errorHandler;
