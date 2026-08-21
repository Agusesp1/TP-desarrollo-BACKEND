const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.warn('⚠️ RESEND_API_KEY no está configurada en las variables de entorno.');
}

const resend = apiKey ? new Resend(apiKey) : null;
const DEFAULT_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

/**
 * Función genérica para enviar correos electrónicos con Resend.
 * @param {Object} params
 * @param {string} params.to - Destinatario o array de destinatarios
 * @param {string} params.subject - Asunto del correo
 * @param {string} [params.html] - Contenido HTML
 * @param {string} [params.text] - Contenido en texto plano
 * @param {string} [params.from] - Remitente opcional
 */
const enviarMail = async ({ to, subject, html, text, from = DEFAULT_FROM }) => {
  try {
    if (!resend) {
      console.warn('⚠️ No se envió correo: RESEND_API_KEY no está configurada.');
      return { exito: false, error: 'RESEND_API_KEY no configurada' };
    }
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text
    });

    console.log('✅ Correo enviado exitosamente vía Resend:', data);
    return { exito: true, data };
  } catch (error) {
    console.error('❌ Error al enviar correo con Resend:', error);
    return { exito: false, error: error.message || error };
  }
};

/**
 * Envía un correo de bienvenida a un usuario recién registrado.
 * @param {Object} usuario
 * @param {string} usuario.nombre
 * @param {string} usuario.email
 */
const enviarMailBienvenida = async ({ nombre, email }) => {
  const subject = '¡Bienvenido/a a GymFit!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4F46E5; text-align: center;">¡Hola, ${nombre}! 👋</h2>
      <p style="font-size: 16px; color: #333333;">
        Gracias por registrarte en nuestra plataforma. Estamos encantados de tenerte con nosotros.
      </p>
      <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #555555;">
          Tu cuenta ha sido creada exitosamente con el correo: <strong>${email}</strong>.
        </p>
      </div>
      <p style="font-size: 14px; color: #777777; text-align: center; margin-top: 30px;">
        Si tienes alguna duda, responde directamente a este correo o contáctanos a <a href="mailto:administraciongymfit@gmail.com">administraciongymfit@gmail.com</a>.
      </p>
    </div>
  `;

  return await enviarMail({
    to: email,
    subject,
    html
  });
};

/**
 * Envía un correo de consulta desde el formulario de contacto.
 * @param {Object} datos
 * @param {string} datos.nombre
 * @param {string} datos.email
 * @param {string} datos.asunto
 * @param {string} datos.mensaje
 */
const enviarMailContacto = async ({ nombre, email, asunto, mensaje }) => {
  const subjectHeader = asunto ? `[Consulta Web] ${asunto}` : '[Consulta Web] Nuevo mensaje de contacto';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4F46E5; text-align: center;">📨 Nueva Consulta desde la Web</h2>
      <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Nombre:</strong> ${nombre}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email de contacto:</strong> <a href="mailto:${email}">${email}</a></p>
        <p style="margin: 0 0 10px 0;"><strong>Asunto:</strong> ${asunto || 'Sin asunto'}</p>
      </div>
      <div style="border-left: 4px solid #4F46E5; padding-left: 15px; margin: 20px 0; color: #333333;">
        <p style="margin: 0; font-weight: bold;">Mensaje:</p>
        <p style="white-space: pre-wrap; margin-top: 5px;">${mensaje}</p>
      </div>
      <p style="font-size: 12px; color: #888888; text-align: center; margin-top: 30px;">
        Este mensaje fue enviado desde el formulario de contacto de FitApp.
      </p>
    </div>
  `;

  return await enviarMail({
    to: 'administraciongymfit@gmail.com',
    subject: subjectHeader,
    html
  });
};

module.exports = {
  resend,
  enviarMail,
  enviarMailBienvenida,
  enviarMailContacto
};

