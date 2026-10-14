const emailService = require('../services/email.service');

// Controller para enviar un correo de prueba o personalizado
const enviarCorreo = async (req, res) => {
  const { to, subject, html } = req.body;

  // Destinatario por defecto si no se especifica
  const destinatario = to || process.env.ADMIN_EMAIL || 'administraciongymfit@gmail.com';
  const asunto = subject || 'Hola Mundo desde GymFit API';
  const contenidoHtml = html || '<p>¡Felicitaciones por enviar tu <strong>primer correo</strong>!</p>';

  try {
    const resultado = await emailService.enviarMail({
      to: destinatario,
      subject: asunto,
      html: contenidoHtml
    });

    if (!resultado.success) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo enviar el correo electrónico',
        detalles: resultado.error
      });
    }

    return res.json({
      success: true,
      message: 'Correo electrónico enviado con éxito',
      respuesta: resultado.data
    });
  } catch (error) {
    console.error('Error en controller de email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al procesar el envío de correo',
      detalles: error.message
    });
  }
};

// Controller para recibir mensajes del Formulario de Contacto
const enviarContacto = async (req, res) => {
  const { name, email, asunto, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Nombre, correo y mensaje son requeridos.'
    });
  }

  try {
    const resultado = await emailService.enviarMailContacto({
      name,
      email,
      asunto,
      message
    });

    if (!resultado.success) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo enviar el mensaje de contacto',
        detalles: resultado.error
      });
    }

    return res.json({
      success: true,
      message: 'Mensaje de contacto enviado con éxito',
      respuesta: resultado.data
    });
  } catch (error) {
    console.error('Error al procesar mensaje de contacto:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al procesar la consulta de contacto',
      detalles: error.message
    });
  }
};

module.exports = {
  enviarCorreo,
  enviarContacto
};

