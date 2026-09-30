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
    const precioVigenteHoy = await cuotaService.obtenerPrecioVigenteParaFecha(hoyStr);

    return res.json({
      exito: true,
      fechaConsulta: hoyStr,
      precioVigente: precioVigenteHoy,
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
      return res.json({
        exito: true,
        mensaje: `Precio para la fecha ${fechaFormateada} actualizado exitosamente`,
        precio
      });
    }

    precio = await PrecioCuota.create({
      monto: Number(monto),
      fecha_desde: fechaFormateada,
      descripcion: descripcion || `Precio configurado para vigencia desde ${fechaFormateada}`,
      activo: activo !== undefined ? activo : true
    });

    return res.status(201).json({
      exito: true,
      mensaje: 'Nuevo precio programado registrado con éxito',
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

    const title = `Gimnasio FitApp - Cuota N° ${cuota.numero_cuota} (${cuota.periodo})`;
    const preferenceId = `MP-PREF-${cuota.id}-${Date.now()}`;
    const initPoint = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${preferenceId}`;

    await cuota.update({
      mp_preference_id: preferenceId
    });

    return res.json({
      exito: true,
      preferenceId,
      init_point: initPoint,
      cuota_id: cuota.id,
      monto: cuota.monto,
      title,
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
  try {
    const cuotaId =
      req.body?.cuota_id ||
      req.body?.external_reference ||
      req.query?.cuota_id ||
      req.query?.external_reference ||
      req.params?.id;

    const paymentId =
      req.body?.payment_id ||
      req.body?.data?.id ||
      req.query?.payment_id ||
      req.query?.collection_id ||
      `MP-${Date.now()}`;

    let cuota = null;

    if (cuotaId) {
      cuota = await Cuota.findByPk(cuotaId);
    }

    // Si aún no se encontró y se pasó preference_id
    const preferenceId = req.body?.preference_id || req.query?.preference_id;
    if (!cuota && preferenceId) {
      cuota = await Cuota.findOne({ where: { mp_preference_id: preferenceId } });
    }

    if (!cuota) {
      return res.status(404).json({
        exito: false,
        mensaje: 'No se encontró la cuota asociada a la transacción de Mercado Pago'
      });
    }

    const comprobanteMP = `MP-${paymentId}`;

    await cuota.update({
      estado: 'pagado',
      mp_payment_id: String(paymentId),
      mp_status: 'approved',
      metodo_pago: 'Mercado Pago',
      comprobante: comprobanteMP,
      fecha_pago: new Date()
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

    console.log(`✅ Pago de cuota ${cuota.id} acreditado exitosamente con Mercado Pago (${comprobanteMP})`);

    return res.json({
      exito: true,
      mensaje: 'Pago de cuota acreditado correctamente mediante Mercado Pago',
      comprobante: comprobanteMP,
      cuota: mapearCuotaParaFront(cuota)
    });
  } catch (error) {
    console.error('Error al procesar webhook / éxito de Mercado Pago:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al procesar el pago de Mercado Pago',
      detalles: error.message
    });
  }
};

module.exports = {
  obtenerMisCuotas,
  obtenerTodasCuotas,
  obtenerHistorialPrecios,
  crearOActualizarPrecio,
  pagarCuotaManual,
  crearPreferenciaMP,
  webhookMercadoPago,
  procesarExitoMP: webhookMercadoPago
};
