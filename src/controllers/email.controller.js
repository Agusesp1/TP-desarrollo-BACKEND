const emailService = require('../services/email.service');

// Controller para enviar un correo de prueba o personalizado
const enviarCorreo = async (req, res, next) => {
  const { to, subject, html } = req.body;

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
    next(error);
  }
};

// Controller para recibir mensajes del Formulario de Contacto (validado por middleware)
const enviarContacto = async (req, res, next) => {
  const { name, email, asunto, message } = req.body;

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
    next(error);
  }
};

module.exports = {
  enviarCorreo,
  enviarContacto
};
