const { Op } = require('sequelize');
const Cuota = require('../models/cuota.model');
const PrecioCuota = require('../models/precioCuota.model');
const Usuario = require('../models/usuario.model');
const cuotaService = require('../services/cuota.service');

// Helper para formatear fecha a DD/MM/YYYY para el frontend
const formatearFechaAR = (fecha) => {
  if (!fecha) return null;
  const str = cuotaService.aFechaStr(fecha);
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

// Formatea el objeto cuota con campos enriquecidos para la interfaz de usuario
const mapearCuotaParaFront = (c) => {
  const json = typeof c.toJSON === 'function' ? c.toJSON() : c;
  return {
    ...json,
    concepto: `Cuota ${json.numero_cuota} - ${json.periodo}`,
    fechaVenc: formatearFechaAR(json.fecha_vencimiento),
    fechaLimite: formatearFechaAR(json.fecha_limite_pago),
    fechaPago: json.fecha_pago ? formatearFechaAR(json.fecha_pago) : null,
    metodo: json.metodo_pago
  };
};

/**
 * Obtener cuotas del usuario autenticado o solicitado por ID.
 * Asegura la existencia de las cuotas del mes y actualiza estados de vencimiento / mora.
 */
const obtenerMisCuotas = async (req, res) => {
  try {
    const usuarioId =
      req.usuario?.id ||
      req.params.usuario_id ||
      req.query.usuario_id ||
      req.body.usuario_id ||
      req.query.usuarioId ||
      req.body.usuarioId;

    if (!usuarioId) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Se requiere el ID del usuario para consultar las cuotas'
      });
    }

    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    // Los administradores y profesores no poseen cuotas asignadas
    if (usuario.rol === 'admin' || usuario.rol === 'profesor') {
      return res.json({
        exito: false,
        mensaje: 'Los administradores y profesores no poseen cuotas asignadas.'
      });
    }

    // Asegurar que el usuario tenga sus cuotas al día y generadas
    await cuotaService.asegurarCuotasMensuales(usuarioId);

    // Obtener todas las cuotas del usuario
    const todasLasCuotas = await Cuota.findAll({
      where: { usuario_id: usuarioId },
      order: [['numero_cuota', 'ASC']]
    });

    const cuotasMapeadas = todasLasCuotas.map(mapearCuotaParaFront);
    const pendientes = cuotasMapeadas.filter((c) => c.estado !== 'pagado');
    const historial = cuotasMapeadas.filter((c) => c.estado === 'pagado');
    const estadoCobranza = await cuotaService.obtenerEstadoCobranzaUsuario(usuarioId);

    return res.json({
      exito: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        categoria: usuario.categoria,
        rol: usuario.rol,
        estadoCuota: estadoCobranza.estadoCuota,
        alDia: estadoCobranza.alDia,
        demorado: estadoCobranza.demorado
      },
      cuotas: cuotasMapeadas,
      pendientes,
      historial,
      estadoCobranza,
      total: cuotasMapeadas.length
    });
  } catch (error) {
    console.error('Error al obtener mis cuotas:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al consultar las cuotas del usuario',
      detalles: error.message
    });
  }
};

/**
 * Obtener todas las cuotas de los clientes/usuarios (Vista de Administración).
 * Solo incluye cuotas de usuarios con rol 'usuario'.
 * Si 'todas' !== 'true', devuelve únicamente cuotas vencidas (en demora o no pagado).
 */
const obtenerTodasCuotas = async (req, res) => {
  try {
    // Actualizar estados generales previamente
    await cuotaService.actualizarEstadosCuotas();

    const { estado, periodo, usuario_id, todas, soloVencidas } = req.query;
    const whereClause = {};

    if (estado && estado !== 'todos') {
      whereClause.estado = estado;
    } else if (estado === 'todos' || todas === 'true') {
      // Devolver todas las cuotas sin filtrar por estado
    } else if (soloVencidas === 'true' || todas !== 'true') {
      // Filtrar únicamente cuotas vencidas ('en demora' o 'no pagado')
      whereClause.estado = { [Op.in]: ['en demora', 'no pagado'] };
    }

    if (periodo) {
      whereClause.periodo = periodo;
    }
    if (usuario_id) {
      whereClause.usuario_id = usuario_id;
    }

    const cuotas = await Cuota.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          where: { rol: 'usuario' },
          required: true,
          attributes: ['id', 'nombre', 'apellido', 'dni', 'email', 'categoria', 'rol']
        }
      ],
      order: [
        ['fecha_vencimiento', 'DESC'],
        ['id', 'DESC']
      ]
    });

    const cuotasMapeadas = cuotas.map((c) => {
      const mapeada = mapearCuotaParaFront(c);
      return {
        ...mapeada,
        usuario: c.usuario
      };
    });

    return res.json({
      exito: true,
      total: cuotasMapeadas.length,
      cuotas: cuotasMapeadas
    });
  } catch (error) {
    console.error('Error al obtener todas las cuotas (admin):', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener el listado general de cuotas',
      detalles: error.message
    });
  }
};

/**
 * Obtener historial de precios programados y el precio actualmente vigente.
 */
const obtenerHistorialPrecios = async (req, res) => {
  try {
    const precios = await PrecioCuota.findAll({
      order: [['fecha_desde', 'DESC']]
    });

    const hoyStr = cuotaService.getFechaHoyLocal();
    
    // Encontrar el objeto completo del precio vigente hoy
    let precioVigenteHoyObj = precios.find(p => p.activo && p.fecha_desde <= hoyStr);
    
    if (!precioVigenteHoyObj) {
      precioVigenteHoyObj = precios.find(p => p.activo);
    }
    
    if (!precioVigenteHoyObj) {
      precioVigenteHoyObj = { monto: 18000.00, fecha_desde: hoyStr, descripcion: 'Tarifa general por defecto' };
    }

    return res.json({
      exito: true,
      fechaConsulta: hoyStr,
      precioVigente: precioVigenteHoyObj,
      precios
    });
  } catch (error) {
    console.error('Error al consultar historial de precios:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al obtener los precios programados',
      detalles: error.message
    });
  }
};

/**
 * Crear o actualizar un precio de cuota programado con fecha_desde.
 */
const crearOActualizarPrecio = async (req, res) => {
  try {
    const { monto, fecha_desde, descripcion, activo } = req.body;

    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Debe ingresar un monto numérico válido y mayor a 0'
      });
    }

    if (!fecha_desde) {
      return res.status(400).json({
        exito: false,
        mensaje: 'La fecha de entrada en vigencia (fecha_desde) es obligatoria'
      });
    }

    const fechaFormateada = cuotaService.aFechaStr(fecha_desde);

    // Buscar si ya existe un precio configurado exactamente para esa fecha
    let precio = await PrecioCuota.findOne({
      where: { fecha_desde: fechaFormateada }
    });

    if (precio) {
      await precio.update({
        monto: Number(monto),
        descripcion: descripcion || precio.descripcion,
        activo: activo !== undefined ? activo : precio.activo
      });

      // Actualizar el monto de TODAS las cuotas que aún no estén pagadas
      const cuotasPendientes = await Cuota.findAll({
        where: { estado: { [Op.ne]: 'pagado' } }
      });

      for (const cuota of cuotasPendientes) {
        const nuevoMonto = await cuotaService.obtenerPrecioVigenteParaFecha(cuota.fecha_vencimiento);
        if (Number(cuota.monto) !== Number(nuevoMonto)) {
          await cuota.update({ monto: nuevoMonto });
        }
      }

      return res.json({
        exito: true,
        mensaje: `Precio para la fecha ${fechaFormateada} actualizado exitosamente y cuotas pendientes actualizadas`,
        precio
      });
    }

    precio = await PrecioCuota.create({
      monto: Number(monto),
      fecha_desde: fechaFormateada,
      descripcion: descripcion || `Precio configurado para vigencia desde ${fechaFormateada}`,
      activo: activo !== undefined ? activo : true
    });

    // Actualizar el monto de TODAS las cuotas que aún no estén pagadas
    // calculando su precio vigente según su fecha de vencimiento
    const cuotasPendientes = await Cuota.findAll({
      where: { estado: { [Op.ne]: 'pagado' } }
    });

    for (const cuota of cuotasPendientes) {
      const nuevoMonto = await cuotaService.obtenerPrecioVigenteParaFecha(cuota.fecha_vencimiento);
      if (Number(cuota.monto) !== Number(nuevoMonto)) {
        await cuota.update({ monto: nuevoMonto });
      }
    }

    return res.status(201).json({
      exito: true,
      mensaje: 'Nuevo precio programado registrado con éxito y cuotas pendientes actualizadas',
      precio
    });
  } catch (error) {
    console.error('Error al crear o actualizar precio de cuota:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al guardar el precio de cuota',
      detalles: error.message
    });
  }
};

/**
 * Pagar cuota de forma manual (administración o simulación directa).
 */
const pagarCuotaManual = async (req, res) => {
  try {
    const id = req.params.id || req.body.cuota_id || req.body.id;
    const { metodo_pago, comprobante, fecha_pago } = req.body;

    if (!id) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El ID de la cuota es obligatorio'
      });
    }

    const cuota = await Cuota.findByPk(id, {
      include: [{ model: Usuario, as: 'usuario' }]
    });

    if (!cuota) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Cuota no encontrada'
      });
    }

    if (cuota.estado === 'pagado') {
      return res.status(400).json({
        exito: false,
        mensaje: 'Esta cuota ya ha sido pagada previamente',
        cuota: mapearCuotaParaFront(cuota)
      });
    }

    const numComprobante =
      comprobante ||
      `COMP-${Math.floor(100000 + Math.random() * 900000)}`;

    await cuota.update({
      estado: 'pagado',
      fecha_pago: fecha_pago || new Date(),
      metodo_pago: metodo_pago || 'Pago Manual / Caja',
      comprobante: numComprobante
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

    return res.json({
      exito: true,
      mensaje: `¡Pago de la cuota ${cuota.periodo} registrado exitosamente!`,
      cuota: mapearCuotaParaFront(cuota)
    });
  } catch (error) {
    console.error('Error al registrar pago manual:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al registrar el pago',
      detalles: error.message
    });
  }
};

/**
 * Preparación de Preferencia para Mercado Pago (SDK / Simulación compatible).
 */
const crearPreferenciaMP = async (req, res) => {
  try {
    const cuotaId = req.params.id || req.body.cuota_id || req.body.id;

    if (!cuotaId) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El ID de la cuota es obligatorio'
      });
    }

    const cuota = await Cuota.findByPk(cuotaId, {
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'email', 'dni']
        }
      ]
    });

    if (!cuota) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Cuota no encontrada'
      });
    }

    if (cuota.estado === 'pagado') {
      return res.status(400).json({
        exito: false,
        mensaje: 'Esta cuota ya se encuentra pagada'
      });
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return res.status(500).json({ exito: false, mensaje: 'Mercado Pago no está configurado (falta Access Token).' });
    }

    const { MercadoPagoConfig, Preference } = require('mercadopago');
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
    const preference = new Preference(client);

    const title = `Gimnasio FitApp - Cuota N° ${cuota.numero_cuota} (${cuota.periodo})`;

    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isHttp = frontUrl.startsWith('http://');

    // No utilizar redirectors intermedios como httpbin.org, ya que Mercado Pago añade parámetros
    // a la query string (status, external_reference, etc.) y los proxies suelen descartarlos.
    // Mercado Pago admite URLs http://localhost... para back_urls en entorno de pruebas.
    const getBackUrl = (path) => {
      return `${frontUrl}${path}`;
    };

    const body = {
      items: [
        {
          id: cuota.id.toString(),
          title: title,
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
      notification_url: `${process.env.BACKEND_URL || 'https://tu-dominio.com'}/api/cuotas/mercadopago/webhook`,
      external_reference: cuota.id.toString()
    };

    const response = await preference.create({ body });

    await cuota.update({
      mp_preference_id: response.id
    });

    return res.json({
      exito: true,
      preferenceId: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      cuota_id: cuota.id,
      monto: cuota.monto,
      title: title,
      socio: {
        nombre: `${cuota.usuario?.nombre || ''} ${cuota.usuario?.apellido || ''}`.trim(),
        email: cuota.usuario?.email
      },
      cuota: mapearCuotaParaFront(cuota)
    });
  } catch (error) {
    console.error('Error al crear preferencia de Mercado Pago:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al generar preferencia de pago',
      detalles: error.message
    });
  }
};

/**
 * Webhook y procesamiento de pago aprobado de Mercado Pago.
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
        const cuotaId = paymentData.external_reference;
        const status = paymentData.status;

        const cuota = await Cuota.findByPk(cuotaId);
        
        if (cuota) {
          await cuota.update({
            mp_payment_id: paymentId.toString(),
            mp_status: status
          });

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

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando Webhook de MP:', error);
    return res.status(500).send('Error');
  }
};

/**
 * Confirmación robusta de pago de Mercado Pago.
 * Soporta parámetros por body o query string (cuota_id, payment_id, status, preference_id).
 * Acredita la cuota, registra comprobante y reactiva al socio si ya no adeuda cuotas en mora.
 */
const confirmarPagoMP = async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};

    const cuotaId =
      body.cuota_id ||
      body.cuotaId ||
      body.id ||
      body.external_reference ||
      query.cuota_id ||
      query.cuotaId ||
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

    let cuota = null;

    if (cuotaId) {
      cuota = await Cuota.findByPk(cuotaId, {
        include: [{ model: Usuario, as: 'usuario' }]
      });
    }

    if (!cuota && preferenceId) {
      cuota = await Cuota.findOne({
        where: { mp_preference_id: preferenceId },
        include: [{ model: Usuario, as: 'usuario' }]
      });
    }

    if (!cuota) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Cuota no encontrada'
      });
    }

    // Si la cuota ya estaba pagada previamente, retorna éxito sin error
    if (cuota.estado === 'pagado') {
      let usuarioInfo = null;
      if (cuota.usuario_id) {
        const cobranza = await cuotaService.obtenerEstadoCobranzaUsuario(cuota.usuario_id);
        const usuario = await Usuario.findByPk(cuota.usuario_id);
        if (usuario) {
          const { password: _, ...userData } = usuario.toJSON();
          usuarioInfo = {
            ...userData,
            estadoCuota: cobranza.estadoCuota,
            alDia: cobranza.alDia,
            demorado: cobranza.demorado
          };
        }
      }

      return res.json({
        exito: true,
        mensaje: 'La cuota ya se encuentra pagada',
        cuota: mapearCuotaParaFront(cuota),
        usuario: usuarioInfo
      });
    }

    // Actualiza la cuota a estado pagado con el comprobante MP
    const numComprobante = 'MP-' + (paymentId || Date.now());
    const updateData = {
      estado: 'pagado',
      fecha_pago: new Date(),
      metodo_pago: 'Mercado Pago',
      comprobante: numComprobante,
      mp_payment_id: (paymentId || '').toString(),
      mp_status: status || 'approved'
    };

    if (preferenceId && !cuota.mp_preference_id) {
      updateData.mp_preference_id = preferenceId;
    }

    await cuota.update(updateData);
    await cuota.reload();

    // Sincroniza la cobranza del usuario: si el usuario estaba pausado (estado === false)
    // y ya no tiene deudas en mora (no pagado), reactiva al usuario (estado = true)
    let usuarioActualizado = null;
    if (cuota.usuario_id) {
      const cobranza = await cuotaService.obtenerEstadoCobranzaUsuario(cuota.usuario_id);
      const usuario = await Usuario.findByPk(cuota.usuario_id);

      if (usuario) {
        if (!usuario.estado && cobranza.estadoCuota !== 'Con Deuda') {
          await usuario.update({ estado: true });
        }

        const { password: _, ...userData } = usuario.toJSON();
        usuarioActualizado = {
          ...userData,
          estadoCuota: cobranza.estadoCuota,
          alDia: cobranza.alDia,
          demorado: cobranza.demorado
        };
      }
    }

    return res.json({
      exito: true,
      mensaje: 'Pago acreditado con éxito',
      cuota: mapearCuotaParaFront(cuota),
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('Error al confirmar pago de Mercado Pago:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno al confirmar el pago',
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

