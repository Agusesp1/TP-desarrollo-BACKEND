const { Op } = require('sequelize');
const Quota = require('../models/quota.model');
const PriceCuota = require('../models/priceCuota.model');
const User = require('../models/user.model');

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Obtiene la date actual en formato local 'YYYY-MM-DD'.
 */
const getFechaHoyLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convierte un objeto Date o string a formato 'YYYY-MM-DD'.
 */
const aFechaStr = (date) => {
  if (!date) return getFechaHoyLocal();
  if (typeof date === 'string') {
    // Si viene con '/', convertir DD/MM/YYYY
    if (date.includes('/')) {
      const partes = date.split('/');
      if (partes.length === 3) {
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    }
    return date.substring(0, 10);
  }
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(date).substring(0, 10);
};

/**
 * Suma N meses a una date en formato 'YYYY-MM-DD'.
 * Maneja el desborde de fin de month correctamente (ej: 31 de enero + 1 month = 28 de febrero).
 */
const sumarMeses = (dateStr, cantMeses) => {
  const limpio = aFechaStr(dateStr);
  const [y, m, d] = limpio.split('-').map(Number);
  let nuevoAno = y;
  let nuevoMes = m - 1 + cantMeses; // 0-indexed
  nuevoAno += Math.floor(nuevoMes / 12);
  nuevoMes = ((nuevoMes % 12) + 12) % 12;

  const diasEnMes = new Date(nuevoAno, nuevoMes + 1, 0).getDate();
  const nuevoDia = Math.min(d, diasEnMes);
  const mm = String(nuevoMes + 1).padStart(2, '0');
  const dd = String(nuevoDia).padStart(2, '0');
  return `${nuevoAno}-${mm}-${dd}`;
};

/**
 * Suma N días a una date en formato 'YYYY-MM-DD'.
 */
const sumarDias = (dateStr, cantDias) => {
  const limpio = aFechaStr(dateStr);
  const [y, m, d] = limpio.split('-').map(Number);
  const date = new Date(y, m - 1, d + cantDias);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Obtiene el name del periodo en español (ej. 'Octubre 2026') a partir de una date.
 */
const formatearPeriodo = (dateStr) => {
  const limpio = aFechaStr(dateStr);
  const [y, m] = limpio.split('-').map(Number);
  const nameMes = NOMBRES_MESES[m - 1] || 'Month';
  return `${nameMes} ${y}`;
};

/**
 * Obtiene el price vigente de la quota para una date dada.
 * Busca el PriceCuota con start_date <= date ordenado descendente.
 * Fallback por defecto: 18000.00
 */
const obtenerPrecioVigenteParaFecha = async (date = null) => {
  try {
    const dateRef = aFechaStr(date || getFechaHoyLocal());

    const price = await PriceCuota.findOne({
      where: {
        active: true,
        start_date: {
          [Op.lte]: dateRef
        }
      },
      order: [['start_date', 'DESC']]
    });

    if (price) {
      return parseFloat(price.amount);
    }

    // Fallback: si no hay con date <= dateRef, tomar el más cercano disponible
    const priceFallback = await PriceCuota.findOne({
      where: { active: true },
      order: [['start_date', 'ASC']]
    });

    if (priceFallback) {
      return parseFloat(priceFallback.amount);
    }

    // Fallback general por defecto
    return 18000.00;
  } catch (error) {
    console.warn('⚠️ Error al obtener price vigente de quota, usando fallback:', error.message);
    return 18000.00;
  }
};

/**
 * Calcula el status real de una quota según la date actual o una date de referencia:
 * - 'pagado': si date_payment existe o status ya es 'pagado'
 * - 'pendiente': si hoy <= date_vencimiento
 * - 'en demora': si date_vencimiento < hoy <= date_limite_payment (5 días de gracia tras vencerse el month)
 * - 'no pagado': si hoy > date_limite_payment
 */
const calcularEstadoReal = (quota, dateReferencia = null) => {
  if (quota.date_payment || quota.status === 'pagado') {
    return 'pagado';
  }

  const hoyStr = aFechaStr(dateReferencia || getFechaHoyLocal());
  const vencStr = aFechaStr(quota.date_vencimiento);
  const limiteStr = aFechaStr(quota.date_limite_payment);

  if (hoyStr <= vencStr) {
    return 'pendiente';
  }

  if (hoyStr > vencStr && hoyStr <= limiteStr) {
    return 'en demora';
  }

  return 'no pagado';
};

/**
 * Genera automáticamente 5 quotas iniciales correspondientes a los próximos 5 meses desde la inscripción.
 */
const generateInitialQuotas = async (userId, dateInscripcion = null) => {
  try {
    if (!userId) {
      throw new Error('userId es obligatorio para generar quotas');
    }

    // Verificar el user en la BD. Si role !== 'user', no generar quotas y retornar []
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'user') {
      return [];
    }

    // Verificar si el user ya posee quotas creadas
    const quotasExistentes = await Quota.findAll({
      where: { user_id: userId },
      order: [['numero_quota', 'ASC']]
    });

    if (quotasExistentes.length >= 5) {
      return quotasExistentes;
    }

    const dateBase = aFechaStr(dateInscripcion || user.enrollment_date || getFechaHoyLocal());
    const quotasACrear = [];
    const numerosExistentes = new Set(quotasExistentes.map((c) => c.numero_quota));

    for (let i = 1; i <= 5; i++) {
      if (numerosExistentes.has(i)) {
        continue;
      }

      // Emisión: día de inscripción + (i-1) meses
      const dateEmision = sumarMeses(dateBase, i - 1);
      // Vencimiento: 1 month exacto después de la date de emisión
      const dateVencimiento = sumarMeses(dateBase, i);
      // Límite de payment: 5 días después de la date de vencimiento
      const dateLimitePago = sumarDias(dateVencimiento, 5);
      // Periodo: month y año de la quota
      const periodo = formatearPeriodo(dateEmision);

      let amountBase = await obtenerPrecioVigenteParaFecha(dateVencimiento);
      let amount = amountBase;
      if (user.category === 'Medium') {
        amount = amountBase * 0.95;
      } else if (user.category === 'Premium') {
        amount = amountBase * 0.85;
      }

      const status = calcularEstadoReal({
        date_vencimiento: dateVencimiento,
        date_limite_payment: dateLimitePago,
        status: 'pendiente'
      });

      quotasACrear.push({
        user_id: userId,
        numero_quota: i,
        periodo,
        amount,
        date_emision: dateEmision,
        date_vencimiento: dateVencimiento,
        date_limite_payment: dateLimitePago,
        status
      });
    }

    let nuevasCuotas = [];
    if (quotasACrear.length > 0) {
      nuevasCuotas = await Quota.bulkCreate(quotasACrear);
      console.log(`✅ ${nuevasCuotas.length} quotas iniciales creadas para el user ${userId}`);
    }

    const todas = await Quota.findAll({
      where: { user_id: userId },
      order: [['numero_quota', 'ASC']]
    });

    return todas;
  } catch (error) {
    console.error(`❌ Error en generateInitialQuotas para user ${userId}:`, error);
    throw error;
  }
};

/**
 * Verifica las quotas del user y genera nuevas quotas mensuales para que siempre cuente
 * con la quota del month siguiente o mantenga las quotas al día si avanzó el tiempo.
 */
const asegurarCuotasMensuales = async (userId) => {
  try {
    if (!userId) return [];

    // Verificar el user. Si role !== 'user', no generar nada y retornar []
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'user') {
      return [];
    }

    const quotas = await Quota.findAll({
      where: { user_id: userId },
      order: [['numero_quota', 'ASC']]
    });

    if (quotas.length === 0) {
      const dateBase = user.enrollment_date || getFechaHoyLocal();
      return await generateInitialQuotas(userId, dateBase);
    }

    // Obtener la última quota existente
    let ultimaCuota = quotas[quotas.length - 1];
    const hoyStr = getFechaHoyLocal();
    // Queremos que siempre exista como mínimo una quota para el próximo month
    const dateObjetivo = sumarMeses(hoyStr, 1);

    while (ultimaCuota.date_vencimiento < dateObjetivo) {
      const nuevoNumero = ultimaCuota.numero_quota + 1;
      const dateEmision = ultimaCuota.date_vencimiento;
      const dateVencimiento = sumarMeses(dateEmision, 1);
      const dateLimitePago = sumarDias(dateVencimiento, 5);
      const periodo = formatearPeriodo(dateEmision);
      
      let amountBase = await obtenerPrecioVigenteParaFecha(dateVencimiento);
      let amount = amountBase;
      if (user.category === 'Medium') {
        amount = amountBase * 0.95;
      } else if (user.category === 'Premium') {
        amount = amountBase * 0.85;
      }

      const status = calcularEstadoReal({
        date_vencimiento: dateVencimiento,
        date_limite_payment: dateLimitePago,
        status: 'pendiente'
      });

      ultimaCuota = await Quota.create({
        user_id: userId,
        numero_quota: nuevoNumero,
        periodo,
        amount,
        date_emision: dateEmision,
        date_vencimiento: dateVencimiento,
        date_limite_payment: dateLimitePago,
        status
      });
      console.log(`✅ Quota mensual subsecuente N° ${nuevoNumero} (${periodo}) creada para user ${userId}`);
    }

    // Actualizar estados
    await updateQuotasStatuses(userId);

    return await Quota.findAll({
      where: { user_id: userId },
      order: [['numero_quota', 'ASC']]
    });
  } catch (error) {
    console.error(`❌ Error en asegurarCuotasMensuales para user ${userId}:`, error);
    throw error;
  }
};

/**
 * Evalúa y actualiza en BD los estados de las quotas que no estén pagadas según la date actual.
 * Puede ejecutarse para un user específico o para todas las quotas de la base de datos.
 */
const updateQuotasStatuses = async (userId = null) => {
  try {
    const whereClause = {
      status: {
        [Op.ne]: 'pagado'
      }
    };

    if (userId) {
      whereClause.user_id = userId;
    }

    const quotasNoPagadas = await Quota.findAll({ where: whereClause });
    const hoyStr = getFechaHoyLocal();
    let actualizadas = 0;

    for (const quota of quotasNoPagadas) {
      const nuevoEstado = calcularEstadoReal(quota, hoyStr);
      if (quota.status !== nuevoEstado) {
        await quota.update({ status: nuevoEstado });
        actualizadas++;
      }
    }

    return { totalEvaluadas: quotasNoPagadas.length, actualizadas };
  } catch (error) {
    console.error('❌ Error en updateQuotasStatuses:', error);
    throw error;
  }
};

/**
 * Evalúa el status de cobranza global de un user:
 * - Si role !== 'user', retorna { statusCuota: 'N/A', demorado: false, alDia: true, cantVencidas: 0, quotasVencidas: [] }
 * - Si tiene alguna quota en 'no pagado': statusCuota: 'Con Deuda', alDia: false, demorado: false
 * - Si no tiene 'no pagado' pero tiene alguna en 'en demora': statusCuota: 'Demorado', alDia: false, demorado: true
 * - Si todas las quotas vencidas están pagadas (o sólo tiene pendientes a futuro): statusCuota: 'Al Día', alDia: true, demorado: false
 */
const obtenerEstadoCobranzaUsuario = async (userId) => {
  try {
    if (!userId) {
      return {
        statusCuota: 'N/A',
        demorado: false,
        alDia: true,
        cantVencidas: 0,
        quotasVencidas: []
      };
    }

    const user = await User.findByPk(userId);
    if (!user || user.role !== 'user') {
      return {
        statusCuota: 'N/A',
        demorado: false,
        alDia: true,
        cantVencidas: 0,
        quotasVencidas: []
      };
    }

    // Actualizar estados de quotas
    await updateQuotasStatuses(userId);

    const quotas = await Quota.findAll({
      where: { user_id: userId },
      order: [['date_vencimiento', 'ASC'], ['numero_quota', 'ASC']]
    });

    const quotasVencidas = quotas
      .filter((c) => c.status === 'en demora' || c.status === 'no pagado')
      .map((c) => (typeof c.toJSON === 'function' ? c.toJSON() : c));

    const tieneNoPagado = quotas.some((c) => c.status === 'no pagado');
    const tieneEnDemora = quotas.some((c) => c.status === 'en demora');

    let statusCuota = 'Al Día';
    let alDia = true;
    let demorado = false;

    if (tieneNoPagado) {
      statusCuota = 'Con Deuda';
      alDia = false;
      demorado = false;
    } else if (tieneEnDemora) {
      statusCuota = 'Demorado';
      alDia = false;
      demorado = true;
    } else {
      statusCuota = 'Al Día';
      alDia = true;
      demorado = false;
    }

    return {
      statusCuota,
      demorado,
      alDia,
      cantVencidas: quotasVencidas.length,
      quotasVencidas
    };
  } catch (error) {
    console.error(`❌ Error en obtenerEstadoCobranzaUsuario para ${userId}:`, error);
    return {
      statusCuota: 'Al Día',
      demorado: false,
      alDia: true,
      cantVencidas: 0,
      quotasVencidas: []
    };
  }
};

module.exports = {
  getFechaHoyLocal,
  aFechaStr,
  sumarMeses,
  sumarDias,
  formatearPeriodo,
  obtenerPrecioVigenteParaFecha,
  calcularEstadoReal,
  generateInitialQuotas,
  asegurarCuotasMensuales,
  updateQuotasStatuses,
  obtenerEstadoCobranzaUsuario
};
