const { Op } = require('sequelize');
const Quota = require('../models/quota.model');
const PriceCuota = require('../models/priceCuota.model');
const User = require('../models/user.model');
const quotaService = require('../services/quota.service');

// Helper para formatear date a DD/MM/YYYY para el frontend
const formatearFechaAR = (date) => {
  if (!date) return null;
  const str = quotaService.aFechaStr(date);
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

// Formatea el objeto quota con campos enriquecidos para la interfaz de user
const mapearCuotaParaFront = (c) => {
  const json = typeof c.toJSON === 'function' ? c.toJSON() : c;
  return {
    ...json,
    concepto: `Quota ${json.numero_quota} - ${json.periodo}`,
    dateVenc: formatearFechaAR(json.date_vencimiento),
    dateLimite: formatearFechaAR(json.date_limite_payment),
    datePago: json.date_payment ? formatearFechaAR(json.date_payment) : null,
    metodo: json.metodo_payment
  };
};

/**
 * Obtener quotas del user autenticado o solicitado por ID.
 * Asegura la existencia de las quotas del month y actualiza estados de vencimiento / mora.
 */
const obtenerMisCuotas = async (req, res) => {
  try {
    const userId =
      req.user?.id ||
      req.params.user_id ||
      req.query.user_id ||
      req.body.user_id ||
      req.query.userId ||
      req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del user para consultar las quotas'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User no encontrado'
      });
    }

    // Los administradores y teachers no poseen quotas asignadas
    if (user.role === 'admin' || user.role === 'teacher') {
      return res.json({
        success: false,
        message: 'Los administradores y teachers no poseen quotas asignadas.'
      });
    }

    // Asegurar que el user tenga sus quotas al día y generadas
    await quotaService.asegurarCuotasMensuales(userId);

    // Obtener todas las quotas del user
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
    console.error('Error al obtener mis quotas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al consultar las quotas del user',
      detalles: error.message
    });
  }
};

/**
 * Obtener todas las quotas de los clients/users (Vista de Administración).
 * Solo incluye quotas de users con role 'user'.
 * Si 'todas' !== 'true', devuelve únicamente quotas vencidas (en demora o no pagado).
 */
const obtenerTodasCuotas = async (req, res) => {
  try {
    // Actualizar estados generales previamente
    await quotaService.updateQuotasStatuses();

    const { status, periodo, user_id, todas, soloVencidas } = req.query;
    const whereClause = {};

    if (status && status !== 'todos') {
      whereClause.status = status;
    } else if (status === 'todos' || todas === 'true') {
      // Devolver todas las quotas sin filtrar por status
    } else if (soloVencidas === 'true' || todas !== 'true') {
      // Filtrar únicamente quotas vencidas ('en demora' o 'no pagado')
      whereClause.status = { [Op.in]: ['en demora', 'no pagado'] };
    }

    if (periodo) {
      whereClause.periodo = periodo;
    }
    if (user_id) {
      whereClause.user_id = user_id;
    }

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
    console.error('Error al obtener todas las quotas (admin):', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener el listado general de quotas',
      detalles: error.message
    });
  }
};

/**
 * Obtener historial de prices programados y el price actualmente vigente.
 */
const obtenerHistorialPrecios = async (req, res) => {
  try {
    const prices = await PriceCuota.findAll({
      order: [['start_date', 'DESC']]
    });

    const hoyStr = quotaService.getFechaHoyLocal();
    
    // Encontrar el objeto completo del price vigente hoy
    let priceVigenteHoyObj = prices.find(p => p.active && p.start_date <= hoyStr);
    
    if (!priceVigenteHoyObj) {
      priceVigenteHoyObj = prices.find(p => p.active);
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
    console.error('Error al consultar historial de prices:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al obtener los prices programados',
      detalles: error.message
    });
  }
};

/**
 * Crear o actualizar un price de quota programado con start_date.
 */
const crearOActualizarPrecio = async (req, res) => {
  try {
    const { amount, start_date, description, active } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar un amount numérico válido y mayor a 0'
      });
    }

    if (!start_date) {
      return res.status(400).json({
        success: false,
        message: 'La date de entrada en vigencia (start_date) es obligatoria'
      });
    }

    const dateFormateada = quotaService.aFechaStr(start_date);

    // Buscar si ya existe un price configurado exactamente para esa date
    let price = await PriceCuota.findOne({
      where: { start_date: dateFormateada }
    });

    if (price) {
      await price.update({
        amount: Number(amount),
        description: description || price.description,
        active: active !== undefined ? active : price.active
      });

      // Actualizar el amount de TODAS las quotas que aún no estén pagadas
      const quotasPendientes = await Quota.findAll({
        where: { status: { [Op.ne]: 'pagado' } }
      });

      for (const quota of quotasPendientes) {
        const nuevoMonto = await quotaService.obtenerPrecioVigenteParaFecha(quota.date_vencimiento);
        if (Number(quota.amount) !== Number(nuevoMonto)) {
          await quota.update({ amount: nuevoMonto });
        }
      }

      return res.json({
        success: true,
        message: `Price para la date ${dateFormateada} actualizado exitosamente y quotas pendientes actualizadas`,
        price
      });
    }

    price = await PriceCuota.create({
      amount: Number(amount),
      start_date: dateFormateada,
      description: description || `Price configurado para vigencia desde ${dateFormateada}`,
      active: active !== undefined ? active : true
    });

    // Actualizar el amount de TODAS las quotas que aún no estén pagadas
    // calculando su price vigente según su date de vencimiento
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
      message: 'Nuevo price programado registrado con éxito y quotas pendientes actualizadas',
      price
    });
  } catch (error) {
    console.error('Error al crear o actualizar price de quota:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al guardar el price de quota',
      detalles: error.message
    });
  }
};

/**
 * Pagar quota de forma manual (administración o simulación directa).
 */
const pagarCuotaManual = async (req, res) => {
  try {
    const id = req.params.id || req.body.quota_id || req.body.id;
    const { metodo_payment, receipt, date_payment } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la quota es obligatorio'
      });
    }

    const quota = await Quota.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota no encontrada'
      });
    }

    if (quota.status === 'pagado') {
      return res.status(400).json({
        success: false,
        message: 'Esta quota ya ha sido pagada previamente',
        quota: mapearCuotaParaFront(quota)
      });
    }

    const numComprobante =
      receipt ||
      `COMP-${Math.floor(100000 + Math.random() * 900000)}`;

    await quota.update({
      status: 'pagado',
      date_payment: date_payment || new Date(),
      metodo_payment: metodo_payment || 'Payment Manual / Caja',
      receipt: numComprobante
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

    return res.json({
      success: true,
      message: `¡Payment de la quota ${quota.periodo} registrado exitosamente!`,
      quota: mapearCuotaParaFront(quota)
    });
  } catch (error) {
    console.error('Error al registrar payment manual:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al registrar el payment',
      detalles: error.message
    });
  }
};

/**
 * Preparación de Preferencia para Mercado Payment (SDK / Simulación compatible).
 */
const crearPreferenciaMP = async (req, res) => {
  try {
    const quotaId = req.params.id || req.body.quota_id || req.body.id;

    if (!quotaId) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la quota es obligatorio'
      });
    }

    const quota = await Quota.findByPk(quotaId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'lastname', 'email', 'dni']
        }
      ]
    });

    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Quota no encontrada'
      });
    }

    if (quota.status === 'pagado') {
      return res.status(400).json({
        success: false,
        message: 'Esta quota ya se encuentra pagada'
      });
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return res.status(500).json({ success: false, message: 'Mercado Payment no está configurado (falta Access Token).' });
    }

    const { MercadoPagoConfig, Preference } = require('mercadopago');
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preference = new Preference(client);

    const title = `Gym FitApp - Quota N° ${quota.numero_quota} (${quota.periodo})`;

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
          title: title,
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
      notification_url: `${process.env.BACKEND_URL || 'https://tu-dominio.com'}/api/quotas/mercadopago/webhook`,
      external_reference: quota.id.toString()
    };

    const response = await preference.create({ body });

    await quota.update({
      mp_preference_id: response.id
    });

    return res.json({
      success: true,
      preferenceId: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      quota_id: quota.id,
      amount: quota.amount,
      title: title,
      member: {
        name: `${quota.user?.name || ''} ${quota.user?.lastname || ''}`.trim(),
        email: quota.user?.email
      },
      quota: mapearCuotaParaFront(quota)
    });
  } catch (error) {
    console.error('Error al crear preferencia de Mercado Payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al generar preferencia de payment',
      detalles: error.message
    });
  }
};

/**
 * Webhook y procesamiento de payment aprobado de Mercado Payment.
 */
const webhookMercadoPago = async (req, res) => {
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

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando Webhook de MP:', error);
    return res.status(500).send('Error');
  }
};

/**
 * Confirmación robusta de payment de Mercado Payment.
 * Soporta parámetros por body o query string (quota_id, payment_id, status, preference_id).
 * Acredita la quota, registra receipt y reactiva al member si ya no adeuda quotas en mora.
 */
const confirmarPagoMP = async (req, res) => {
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
        message: 'Quota no encontrada'
      });
    }

    // Si la quota ya estaba pagada previamente, retorna éxito sin error
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
        message: 'La quota ya se encuentra pagada',
        quota: mapearCuotaParaFront(quota),
        user: userInfo
      });
    }

    // Actualiza la quota a status pagado con el receipt MP
    const numComprobante = 'MP-' + (paymentId || Date.now());
    const updateData = {
      status: 'pagado',
      date_payment: new Date(),
      metodo_payment: 'Mercado Payment',
      receipt: numComprobante,
      mp_payment_id: (paymentId || '').toString(),
      mp_status: status || 'approved'
    };

    if (preferenceId && !quota.mp_preference_id) {
      updateData.mp_preference_id = preferenceId;
    }

    await quota.update(updateData);
    await quota.reload();

    // Sincroniza la cobranza del user: si el user estaba pausado (status === false)
    // y ya no tiene deudas en mora (no pagado), reactiva al user (status = true)
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
      message: 'Payment acreditado con éxito',
      quota: mapearCuotaParaFront(quota),
      user: userActualizado
    });
  } catch (error) {
    console.error('Error al confirmar payment de Mercado Payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al confirmar el payment',
      detalles: error.message
    });
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

