const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const Cuota = require('../models/cuota.model');
const Usuario = require('../models/usuario.model');
const cuotaService = require('../services/cuota.service');
const cuotaController = require('./cuota.controller');

const crearPreferenciaPago = async (req, res) => {
  const cuotaId = req.body.cuota_id || req.body.id;

  try {
    const cuota = await Cuota.findOne({
      where: { id: cuotaId },
      include: [{ model: Usuario, as: 'usuario' }]
    });

    if (!cuota) {
      return res.status(404).json({ exito: false, mensaje: 'Cuota no encontrada' });
    }

    if (cuota.estado === 'pagado') {
      return res.status(400).json({ exito: false, mensaje: 'Esta cuota ya se encuentra pagada' });
    }

    // Si no hay token de MP, enviar error
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return res.status(500).json({ exito: false, mensaje: 'El servidor no tiene configurado Mercado Pago. Por favor, contacte al administrador.' });
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, options: { timeout: 5000 } });
    const preference = new Preference(client);

    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isHttp = frontUrl.startsWith('http://');

    // No utilizar redirectors intermedios como httpbin.org, ya que Mercado Pago añade parámetros
    // a la query string (status, external_reference, etc.) y los proxies suelen descartarlos.
    const getBackUrl = (path) => {
      return `${frontUrl}${path}`;
    };

    const body = {
      items: [
        {
          id: cuota.id.toString(),
          title: `Cuota Gimnasio - ${cuota.periodo}`,
          quantity: 1,
          unit_price: Number(cuota.monto),
          currency_id: 'ARS',
        }
      ],
      payer: {
        name: cuota.usuario?.nombre || 'Socio',
        surname: cuota.usuario?.apellido || 'FitApp',
        email: cuota.usuario?.email || 'socio@gymfit.com',
      },
      back_urls: {
        success: getBackUrl('/user?pago=success&tab=cuotas'),
        failure: getBackUrl('/user?pago=failure&tab=cuotas'),
        pending: getBackUrl('/user?pago=pending&tab=cuotas')
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL || 'https://tu-dominio.com'}/api/pagos/webhook`,
      external_reference: cuota.id.toString()
    };

    const response = await preference.create({ body });

    // Guardar el preference_id en la cuota para tracking
    await cuota.update({ mp_preference_id: response.id });

    return res.status(200).json({
      exito: true,
      init_point: response.init_point, // URL para redirigir al usuario en producción
      sandbox_init_point: response.sandbox_init_point, // URL para pruebas
      monto: cuota.monto,
      cuota: cuotaController.mapearCuotaParaFront(cuota)
    });

  } catch (error) {
    console.error('Error al crear preferencia de Mercado Pago:', error);
    return res.status(500).json({ exito: false, mensaje: 'Error al generar link de pago', detalles: error.message });
  }
};

// Recibir notificación de Mercado Pago (Webhook IPN)
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
        const cuotaId = paymentData.external_reference;
        const status = paymentData.status;

        const cuota = await Cuota.findByPk(cuotaId);
        
        if (cuota) {
          // Actualizamos el estado MP
          await cuota.update({
            mp_payment_id: paymentId.toString(),
            mp_status: status
          });

          // Si fue aprobado y no estaba pagada, marcamos como pagado
          if (status === 'approved' && cuota.estado !== 'pagado') {
            await cuota.update({
              estado: 'pagado',
              fecha_pago: new Date(),
              metodo_pago: 'Mercado Pago',
              comprobante: `MP-${paymentId}`
            });

            // Si el usuario estaba desactivado por falta de pago y ya no tiene cuotas con deuda, reactivarlo
            if (cuota.usuario_id) {
              const cobranza = await cuotaService.obtenerEstadoCobranzaUsuario(cuota.usuario_id);
              if (cobranza.estadoCuota !== 'Con Deuda') {
                const u = await Usuario.findByPk(cuota.usuario_id);
                if (u && !u.estado) {
                  await u.update({ estado: true });
                }
              }
            }
          }
        }
      }
    }

    // Mercado Pago requiere un status 200 siempre
    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando Webhook de MP:', error);
    return res.status(500).send('Error');
  }
};

module.exports = {
  crearPreferenciaPago,
  recibirWebhook,
  confirmarPago: cuotaController.confirmarPagoMP,
  confirmarPagoMP: cuotaController.confirmarPagoMP
};
