const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || process.env.ADMIN_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || process.env.ADMIN_PASSWORD;
const DEFAULT_FROM = process.env.EMAIL_FROM || SMTP_USER;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

const enviarMail = async ({ to, subject, html, text, from = DEFAULT_FROM }) => {
  try {
    if (!SMTP_PASS) {
      console.warn('⚠️ No se envió correo: SMTP_PASS no configurada.');
      return { success: false, error: 'Contraseña SMTP no configurada' };
    }
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log('✅ Correo enviado vía Nodemailer:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error('❌ Error Nodemailer:', error);
    return { success: false, error: error.message || error };
  }
};

/**
 * Envía un correo de bienvenida a un user recién registrado.
 * @param {Object} user
 * @param {string} user.name
 * @param {string} user.email
 */
const enviarMailBienvenida = async ({ name, email }) => {
  const subject = '¡Bienvenido/a a GymFit!';
  const adminEmail = process.env.ADMIN_EMAIL || 'administraciongymfit@gmail.com';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4F46E5; text-align: center;">¡Hola, ${name}! 👋</h2>
      <p style="font-size: 16px; color: #333333;">
        Gracias por registrarte en nuestra plataforma. Estamos encantados de tenerte con nosotros.
      </p>
      <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #555555;">
          Tu cuenta ha sido creada exitosamente con el correo: <strong>${email}</strong>.
        </p>
      </div>
      <p style="font-size: 14px; color: #777777; text-align: center; margin-top: 30px;">
        Si tienes alguna duda, responde directamente a este correo o contáctanos a <a href="mailto:${adminEmail}">${adminEmail}</a>.
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
 * @param {string} datos.name
 * @param {string} datos.email
 * @param {string} datos.asunto
 * @param {string} datos.message
 */
const enviarMailContacto = async ({ name, email, asunto, message }) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'administraciongymfit@gmail.com';
  const subjectHeader = asunto ? `[Consulta Web] ${asunto}` : '[Consulta Web] Nuevo message de contacto';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4F46E5; text-align: center;">📨 Nueva Consulta desde la Web</h2>
      <div style="background-color: #F9FAFB; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email de contacto:</strong> <a href="mailto:${email}">${email}</a></p>
        <p style="margin: 0 0 10px 0;"><strong>Asunto:</strong> ${asunto || 'Sin asunto'}</p>
      </div>
      <div style="border-left: 4px solid #4F46E5; padding-left: 15px; margin: 20px 0; color: #333333;">
        <p style="margin: 0; font-weight: bold;">Message:</p>
        <p style="white-space: pre-wrap; margin-top: 5px;">${message}</p>
      </div>
      <p style="font-size: 12px; color: #888888; text-align: center; margin-top: 30px;">
        Este message fue enviado desde el formulario de contacto de FitApp.
      </p>
    </div>
  `;

  return await enviarMail({
    to: adminEmail,
    subject: subjectHeader,
    html
  });
};

/**
 * Envía un correo de recuperación de contraseña.
 */
const enviarMailRecuperacionContrasena = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4F46E5; text-align: center;">Recuperación de Contraseña 🔐</h2>
      <p style="font-size: 16px; color: #333333;">
        Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Restablecer Contraseña
        </a>
      </div>
      <p style="font-size: 14px; color: #777777;">
        Si no solicitaste este cambio, puedes ignorar este correo. El enlace caducará en 1 hora.
      </p>
    </div>
  `;

  return await enviarMail({
    to: email,
    subject: 'Recuperación de Contraseña - GymFit',
    html
  });
};

/**
 * Envía un código de autenticación de dos factores.
 */
const enviarMail2FA = async (email, code) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #4F46E5; text-align: center;">Código de Verificación 🔑</h2>
      <p style="font-size: 16px; color: #333333;">
        Estás intentando iniciar sesión. Ingresa el siguiente código de 6 dígitos para verificar tu cuenta:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; background-color: #F3F4F6; padding: 10px 20px; border-radius: 8px;">
          ${code}
        </span>
      </div>
      <p style="font-size: 14px; color: #777777;">
        Este código expirará en 10 minutos. Si no fuiste tú, por favor contacta a soporte.
      </p>
    </div>
  `;

  return await enviarMail({
    to: email,
    subject: 'Tu código de verificación - GymFit',
    html
  });
};

module.exports = {
  enviarMail,
  enviarMailBienvenida,
  enviarMailContacto,
  enviarMailRecuperacionContrasena,
  enviarMail2FA
};

