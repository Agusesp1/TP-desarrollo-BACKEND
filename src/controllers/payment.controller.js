const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const Quota = require('../models/quota.model');
const User = require('../models/user.model');
const quotaService = require('../services/quota.service');
const quotaController = require('./quota.controller');

// Crear preferencia de pago (validada previamente por middleware)
const crearPreferenciaPago = async (req, res, next) => {
  const quota = req.quota;

  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, options: { timeout: 5000 } });
    const preference = new Preference(client);

    const frontUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const isHttp = frontUrl.startsWith('http://');

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
          title: `Cuota Gym - ${quota.periodo}`,
          quantity: 1,
          unit_price: Number(quota.amount),
          currency_id: 'ARS',
        }
      ],
      payer: {
        name: quota.user?.name || 'Socio',
        surname: quota.user?.lastname || 'FitApp',
        email: quota.user?.email || 'socio@gymfit.com',
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
    await quota.update({ mp_preference_id: response.id });

    return res.status(200).json({
      success: true,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      amount: quota.amount,
      quota: quotaController.mapearCuotaParaFront(quota)
    });
  } catch (error) {
    next(error);
  }
};

// Recibir notificación de Mercado Pago (Webhook IPN)
const recibirWebhook = async (req, res, next) => {
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
          await quota.update({
            mp_payment_id: paymentId.toString(),
            mp_status: status
          });

          if (status === 'approved' && quota.status !== 'pagado') {
            await quota.update({
              status: 'pagado',
              date_payment: new Date(),
              metodo_payment: 'Mercado Pago',
              receipt: `MP-${paymentId}`
            });

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

    return res.status(200).send('OK');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearPreferenciaPago,
  recibirWebhook,
  confirmarPago: quotaController.confirmarPagoMP,
  confirmarPagoMP: quotaController.confirmarPagoMP
};
