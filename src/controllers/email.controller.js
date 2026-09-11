const emailService = require('../services/email.service');

// Controlador para enviar un correo de prueba o personalizado
const enviarCorreo = async (req, res) => {
  const { to, subject, html } = req.body;

  // Destinatario por defecto si no se especifica
  const destinatario = to || process.env.ADMIN_EMAIL || 'administraciongymfit@gmail.com';
  const asunto = subject || 'Hello World desde GymFit API';
  const contenidoHtml = html || '<p>Congrats on sending your <strong>first email</strong> with Resend!</p>';

  try {
    const resultado = await emailService.enviarMail({
      to: destinatario,
      subject: asunto,
      html: contenidoHtml
    });

    if (!resultado.exito) {
      return res.status(500).json({
        exito: false,
        mensaje: 'No se pudo enviar el correo electrónico',
        detalles: resultado.error
      });
    }

    return res.json({
      exito: true,
      mensaje: 'Correo electrónico enviado con éxito',
      respuesta: resultado.data
    });
  } catch (error) {
    console.error('Error en controlador de email:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al procesar el envío de correo',
      detalles: error.message
    });
  }
};

// Controlador para recibir mensajes del Formulario de Contacto
const enviarContacto = async (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Nombre, email y mensaje son requeridos.'
    });
  }

  try {
    const resultado = await emailService.enviarMailContacto({
      nombre,
      email,
      asunto,
      mensaje
    });

    if (!resultado.exito) {
      return res.status(500).json({
        exito: false,
        mensaje: 'No se pudo enviar el mensaje de contacto',
        detalles: resultado.error
      });
    }

    return res.json({
      exito: true,
      mensaje: 'Mensaje de contacto enviado con éxito',
      respuesta: resultado.data
    });
  } catch (error) {
    console.error('Error al procesar mensaje de contacto:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al procesar la consulta de contacto',
      detalles: error.message
    });
  }
};

module.exports = {
  enviarCorreo,
  enviarContacto
};

