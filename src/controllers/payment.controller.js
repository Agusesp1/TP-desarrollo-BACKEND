const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const Quota = require('../models/quota.model');
const User = require('../models/user.model');
const quotaService = require('../services/quota.service');
const quotaController = require('./quota.controller');

const crearPreferenciaPago = async (req, res) => {
  const quotaId = req.body.quota_id || req.body.id;

  try {
    const quota = await Quota.findOne({
      where: { id: quotaId },
      include: [{ model: User, as: 'user' }]
    });

    if (!quota) {
      return res.status(404).json({ success: false, message: 'Quota no encontrada' });
    }

    if (quota.status === 'pagado') {
      return res.status(400).json({ success: false, message: 'Esta quota ya se encuentra pagada' });
    }

    // Si no hay token de MP, enviar error
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return res.status(500).json({ success: false, message: 'El servidor no tiene configurado Mercado Payment. Por favor, contacte al administrador.' });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, options: { timeout: 5000 } });
    const preference = new Preference(client);

    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isHttp = frontUrl.startsWith('http://');

    // Usar httpbin.org para pasar la validación HTTPS de auto_return en entorno local.
    // Incrustamos el ID de la quota en la URL codificada para que el frontend pueda recibirlo,
    // ya que httpbin descarta los parámetros que Mercado Payment añade al final.
    const getBackUrl = (path) => {
      const target = `${frontUrl}${path}`;
      if (isHttp) {
        const targetWithParams = target.includes('?') 
          ? `${target}&external_reference=${quota.id}` 
          : `${target}?external_reference=${quota.id}`;
        return `https://httpbin.org/redirect-to?url=${encodeURIComponent(targetWithParams)}`;
      }
      return target;
    };

    const body = {
      items: [
        {
          id: quota.id.toString(),
          title: `Quota Gym - ${quota.periodo}`,
          quantity: 1,
          unit_price: Number(quota.amount),
          currency_id: 'ARS',
        }
      ],
      payer: {
        name: quota.user?.name || 'Member',
        surname: quota.user?.lastname || 'FitApp',
        email: quota.user?.email || 'member@gymfit.com',
      },
      back_urls: {
        success: getBackUrl('/user?payment=success&tab=quotas'),
        failure: getBackUrl('/user?payment=failure&tab=quotas'),
        pending: getBackUrl('/user?payment=pending&tab=quotas')
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL || 'https://tu-dominio.com'}/api/payments/webhook`,
      external_reference: quota.id.toString()
    };

    const response = await preference.create({ body });

    // Guardar el preference_id en la quota para tracking
    await quota.update({ mp_preference_id: response.id });

    return res.status(200).json({
      success: true,
      init_point: response.init_point, // URL para redirigir al user en producción
      sandbox_init_point: response.sandbox_init_point, // URL para pruebas
      amount: quota.amount,
      quota: quotaController.mapearCuotaParaFront(quota)
    });

  } catch (error) {
    console.error('Error al crear preferencia de Mercado Payment:', error);
    return res.status(500).json({ success: false, message: 'Error al generar link de payment', detalles: error.message });
  }
};

// Recibir notificación de Mercado Payment (Webhook IPN)
const recibirWebhook = async (req, res) => {
  const { query, body } = req;
  const topic = query.topic || query.type || body?.type;
  
  try {
    if (topic === 'payment' || topic === 'payment.created' || topic === 'payment.updated') {
      const paymentId = query.id || query['data.id'] || body?.data?.id;
      
      if (!paymentId) {
        return res.status(400).send('No payment ID');
      }

      const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });
      
      if (paymentData && paymentData.external_reference) {
        const quotaId = paymentData.external_reference;
        const status = paymentData.status;

        const quota = await Quota.findByPk(quotaId);
        
        if (quota) {
          // Actualizamos el status MP
          await quota.update({
            mp_payment_id: paymentId.toString(),
            mp_status: status
          });

          // Si fue aprobado y no estaba pagada, marcamos como pagado
          if (status === 'approved' && quota.status !== 'pagado') {
            await quota.update({
              status: 'pagado',
              date_payment: new Date(),
              metodo_payment: 'Mercado Payment',
              receipt: `MP-${paymentId}`
            });

            // Si el user estaba desactivado por falta de payment y ya no tiene quotas con deuda, reactivarlo
            if (quota.user_id) {
              const cobranza = await quotaService.obtenerEstadoCobranzaUsuario(quota.user_id);
              if (cobranza.statusCuota !== 'Con Deuda') {
                const u = await User.findByPk(quota.user_id);
                if (u && !u.status) {
                  await u.update({ status: true });
                }
              }
            }
          }
        }
      }
    }

    // Mercado Payment requiere un status 200 siempre
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando Webhook de MP:', error);
    return res.status(500).send('Error');
  }
};

module.exports = {
  crearPreferenciaPago,
  recibirWebhook,
  confirmarPago: quotaController.confirmarPagoMP,
  confirmarPagoMP: quotaController.confirmarPagoMP
};
