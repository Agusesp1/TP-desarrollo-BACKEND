const { Op } = require('sequelize');
const Quota = require('../models/quota.model');
const PriceCuota = require('../models/priceCuota.model');
const User = require('../models/user.model');
const quotaService = require('../services/quota.service');

// Helper para formatear fecha a DD/MM/YYYY para el frontend
const formatearFechaAR = (date) => {
  if (!date) return null;
  const str = quotaService.aFechaStr(date);
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

// Formatea el objeto cuota con campos enriquecidos para la interfaz
const mapearCuotaParaFront = (c) => {
  const json = typeof c.toJSON === 'function' ? c.toJSON() : c;
  return {
    ...json,
    concepto: `Cuota ${json.numero_quota} - ${json.periodo}`,
    dateVenc: formatearFechaAR(json.date_vencimiento),
    dateLimite: formatearFechaAR(json.date_limite_payment),
    datePago: json.date_payment ? formatearFechaAR(json.date_payment) : null,
    metodo: json.metodo_payment
  };
};

// Obtener cuotas del usuario autenticado (validado previamente por middleware)
const obtenerMisCuotas = async (req, res, next) => {
  const userId = req.targetUserId;
  const user = req.targetUser;

  try {
    // Asegurar que el usuario tenga sus cuotas generadas y actualizadas
    await quotaService.asegurarCuotasMensuales(userId);

    const todasLasCuotas = await Quota.findAll({
      where: { user_id: userId },
      order: [['numero_quota', 'ASC']]
    });

    const quotasMapeadas = todasLasCuotas.map(mapearCuotaParaFront);
    const pendientes = quotasMapeadas.filter((c) => c.status !== 'pagado');
    const historial = quotasMapeadas.filter((c) => c.status === 'pagado');
    const statusCobranza = await quotaService.obtenerEstadoCobranzaUsuario(userId);

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        category: user.category,
        role: user.role,
        statusCuota: statusCobranza.statusCuota,
        alDia: statusCobranza.alDia,
        demorado: statusCobranza.demorado
      },
      quotas: quotasMapeadas,
      pendientes,
      historial,
      statusCobranza,
      total: quotasMapeadas.length
    });
  } catch (error) {
    next(error);
  }
};

// Obtener todas las cuotas de los socios (panel de administración)
const obtenerTodasCuotas = async (req, res, next) => {
  try {
    await quotaService.updateQuotasStatuses();

    const { status, periodo, user_id, todas, soloVencidas } = req.query;
    const whereClause = {};

    if (status && status !== 'todos') {
      whereClause.status = status;
    } else if (status === 'todos' || todas === 'true') {
      // Devolver todas las cuotas sin filtrar por status
    } else if (soloVencidas === 'true' || todas !== 'true') {
      whereClause.status = { [Op.in]: ['en demora', 'no pagado'] };
    }

    if (periodo) whereClause.periodo = periodo;
    if (user_id) whereClause.user_id = user_id;

    const quotas = await Quota.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          where: { role: 'user' },
          required: true,
          attributes: ['id', 'name', 'lastname', 'dni', 'email', 'category', 'role']
        }
      ],
      order: [
        ['date_vencimiento', 'DESC'],
        ['id', 'DESC']
      ]
    });

    const quotasMapeadas = quotas.map((c) => {
      const mapeada = mapearCuotaParaFront(c);
      return {
        ...mapeada,
        user: c.user
      };
    });

    return res.json({
      success: true,
      total: quotasMapeadas.length,
      quotas: quotasMapeadas
    });
  } catch (error) {
    next(error);
  }
};

// Obtener historial de precios y el precio vigente
const obtenerHistorialPrecios = async (req, res, next) => {
  try {
    const prices = await PriceCuota.findAll({
      order: [['start_date', 'DESC']]
    });

    const hoyStr = quotaService.getFechaHoyLocal();
    let priceVigenteHoyObj = prices.find((p) => p.active && p.start_date <= hoyStr);

    if (!priceVigenteHoyObj) {
      priceVigenteHoyObj = prices.find((p) => p.active);
    }

    if (!priceVigenteHoyObj) {
      priceVigenteHoyObj = { amount: 18000.00, start_date: hoyStr, description: 'Tarifa general por defecto' };
    }

    return res.json({
      success: true,
      dateConsulta: hoyStr,
      priceVigente: priceVigenteHoyObj,
      prices
    });
  } catch (error) {
    next(error);
  }
};

// Crear o actualizar un precio programado (validado previamente por middleware)
const crearOActualizarPrecio = async (req, res, next) => {
  const { amount, start_date, description, active } = req.body;

  try {
    const dateFormateada = quotaService.aFechaStr(start_date);

    let price = await PriceCuota.findOne({
      where: { start_date: dateFormateada }
    });

    if (price) {
      await price.update({
        amount: Number(amount),
        description: description || price.description,
        active: active !== undefined ? active : price.active
      });
    } else {
      price = await PriceCuota.create({
        amount: Number(amount),
        start_date: dateFormateada,
        description: description || `Precio configurado para vigencia desde ${dateFormateada}`,
        active: active !== undefined ? active : true
      });
    }

    // Actualizar el monto de todas las cuotas pendientes
    const quotasPendientes = await Quota.findAll({
      where: { status: { [Op.ne]: 'pagado' } }
    });

    for (const quota of quotasPendientes) {
      const nuevoMonto = await quotaService.obtenerPrecioVigenteParaFecha(quota.date_vencimiento);
      if (Number(quota.amount) !== Number(nuevoMonto)) {
        await quota.update({ amount: nuevoMonto });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Precio para la fecha ${dateFormateada} registrado con éxito y cuotas pendientes actualizadas`,
      price
    });
  } catch (error) {
    next(error);
  }
};

// Pagar cuota de forma manual (validada previamente por middleware)
const pagarCuotaManual = async (req, res, next) => {
  const quota = req.quota;
  const { metodo_payment, receipt, date_payment } = req.body;

  try {
    const numComprobante =
      receipt ||
      `COMP-${Math.floor(100000 + Math.random() * 900000)}`;

    await quota.update({
      status: 'pagado',
      date_payment: date_payment || new Date(),
      metodo_payment: metodo_payment || 'Pago Manual / Caja',
      receipt: numComprobante
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

    return res.json({
      success: true,
      message: `¡Pago de la cuota ${quota.periodo} registrado exitosamente!`,
      quota: mapearCuotaParaFront(quota)
    });
  } catch (error) {
    next(error);
  }
};

// Preparación de Preferencia para Mercado Pago (validada previamente por middleware)
const crearPreferenciaMP = async (req, res, next) => {
  const quota = req.quota;

  try {
    const { MercadoPagoConfig, Preference } = require('mercadopago');
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preference = new Preference(client);

    const title = `Gym FitApp - Cuota N° ${quota.numero_quota} (${quota.periodo})`;
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
          title,
          quantity: 1,
          unit_price: Number(quota.amount),
          currency_id: 'ARS'
        }
      ],
      payer: {
        name: quota.user?.name || 'Socio',
        surname: quota.user?.lastname || 'FitApp',
        email: quota.user?.email || 'socio@gymfit.com'
      },
      back_urls: {
        success: getBackUrl('/user?payment=success&tab=quotas'),
        failure: getBackUrl('/user?payment=failure&tab=quotas'),
        pending: getBackUrl('/user?payment=pending&tab=quotas')
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL || 'https://tu-dominio.com'}/api/quotas/mercadopago/webhook`,
      external_reference: quota.id.toString()
    };

    const response = await preference.create({ body });
    await quota.update({ mp_preference_id: response.id });

    return res.json({
      success: true,
      preferenceId: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      quota_id: quota.id,
      amount: quota.amount,
      title,
      member: {
        name: `${quota.user?.name || ''} ${quota.user?.lastname || ''}`.trim(),
        email: quota.user?.email
      },
      quota: mapearCuotaParaFront(quota)
    });
  } catch (error) {
    next(error);
  }
};

// Webhook de Mercado Pago
const webhookMercadoPago = async (req, res, next) => {
  const { query, body } = req;
  const topic = query.topic || query.type || body?.type;

  try {
    if (topic === 'payment' || topic === 'payment.created' || topic === 'payment.updated') {
      const paymentId = query.id || query['data.id'] || body?.data?.id;

      if (!paymentId) return res.status(400).send('No payment ID');

      const { MercadoPagoConfig, Payment } = require('mercadopago');
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

// Confirmación de pago de Mercado Pago
const confirmarPagoMP = async (req, res, next) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    const quotaId =
      body.quota_id ||
      body.quotaId ||
      body.id ||
      body.external_reference ||
      query.quota_id ||
      query.quotaId ||
      query.id ||
      query.external_reference;

    const paymentId =
      body.payment_id ||
      body.paymentId ||
      body.collection_id ||
      query.payment_id ||
      query.paymentId ||
      query.collection_id;

    const status =
      body.status ||
      body.collection_status ||
      query.status ||
      query.collection_status ||
      'approved';

    const preferenceId =
      body.preference_id ||
      body.preferenceId ||
      query.preference_id ||
      query.preferenceId;

    let quota = null;

    if (quotaId) {
      quota = await Quota.findByPk(quotaId, {
        include: [{ model: User, as: 'user' }]
      });
    }

    if (!quota && preferenceId) {
      quota = await Quota.findOne({
        where: { mp_preference_id: preferenceId },
        include: [{ model: User, as: 'user' }]
      });
    }

    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Cuota no encontrada'
      });
    }

    if (quota.status === 'pagado') {
      let userInfo = null;
      if (quota.user_id) {
        const cobranza = await quotaService.obtenerEstadoCobranzaUsuario(quota.user_id);
        const user = await User.findByPk(quota.user_id);
        if (user) {
          const { password: _, ...userData } = user.toJSON();
          userInfo = {
            ...userData,
            statusCuota: cobranza.statusCuota,
            alDia: cobranza.alDia,
            demorado: cobranza.demorado
          };
        }
      }

      return res.json({
        success: true,
        message: 'La cuota ya se encuentra pagada',
        quota: mapearCuotaParaFront(quota),
        user: userInfo
      });
    }

    const numComprobante = 'MP-' + (paymentId || Date.now());
    const updateData = {
      status: 'pagado',
      date_payment: new Date(),
      metodo_payment: 'Mercado Pago',
      receipt: numComprobante,
      mp_payment_id: (paymentId || '').toString(),
      mp_status: status || 'approved'
    };

    if (preferenceId && !quota.mp_preference_id) {
      updateData.mp_preference_id = preferenceId;
    }

    await quota.update(updateData);
    await quota.reload();

    let userActualizado = null;
    if (quota.user_id) {
      const cobranza = await quotaService.obtenerEstadoCobranzaUsuario(quota.user_id);
      const user = await User.findByPk(quota.user_id);

      if (user) {
        if (!user.status && cobranza.statusCuota !== 'Con Deuda') {
          await user.update({ status: true });
        }

        const { password: _, ...userData } = user.toJSON();
        userActualizado = {
          ...userData,
          statusCuota: cobranza.statusCuota,
          alDia: cobranza.alDia,
          demorado: cobranza.demorado
        };
      }
    }

    return res.json({
      success: true,
      message: 'Pago acreditado con éxito',
      quota: mapearCuotaParaFront(quota),
      user: userActualizado
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  mapearCuotaParaFront,
  formatearFechaAR,
  obtenerMisCuotas,
  obtenerTodasCuotas,
  obtenerHistorialPrecios,
  crearOActualizarPrecio,
  pagarCuotaManual,
  crearPreferenciaMP,
  webhookMercadoPago,
  confirmarPagoMP,
  confirmarMercadoPago: confirmarPagoMP,
  procesarExitoMP: confirmarPagoMP
};
