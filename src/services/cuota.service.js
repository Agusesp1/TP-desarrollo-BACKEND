const { Op } = require('sequelize');
const Cuota = require('../models/cuota.model');
const PrecioCuota = require('../models/precioCuota.model');
const Usuario = require('../models/usuario.model');

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Obtiene la fecha actual en formato local 'YYYY-MM-DD'.
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
const aFechaStr = (fecha) => {
  if (!fecha) return getFechaHoyLocal();
  if (typeof fecha === 'string') {
    // Si viene con '/', convertir DD/MM/YYYY
    if (fecha.includes('/')) {
      const partes = fecha.split('/');
      if (partes.length === 3) {
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    }
    return fecha.substring(0, 10);
  }
  if (fecha instanceof Date) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(fecha).substring(0, 10);
};

/**
 * Suma N meses a una fecha en formato 'YYYY-MM-DD'.
 * Maneja el desborde de fin de mes correctamente (ej: 31 de enero + 1 mes = 28 de febrero).
 */
const sumarMeses = (fechaStr, cantMeses) => {
  const limpio = aFechaStr(fechaStr);
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
 * Suma N días a una fecha en formato 'YYYY-MM-DD'.
 */
const sumarDias = (fechaStr, cantDias) => {
  const limpio = aFechaStr(fechaStr);
  const [y, m, d] = limpio.split('-').map(Number);
  const date = new Date(y, m - 1, d + cantDias);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Obtiene el nombre del periodo en español (ej. 'Octubre 2026') a partir de una fecha.
 */
const formatearPeriodo = (fechaStr) => {
  const limpio = aFechaStr(fechaStr);
  const [y, m] = limpio.split('-').map(Number);
  const nombreMes = NOMBRES_MESES[m - 1] || 'Mes';
  return `${nombreMes} ${y}`;
};

/**
 * Obtiene el precio vigente de la cuota para una fecha dada.
 * Busca el PrecioCuota con fecha_desde <= fecha ordenado descendente.
 * Fallback por defecto: 18000.00
 */
const obtenerPrecioVigenteParaFecha = async (fecha = null) => {
  try {
    const fechaRef = aFechaStr(fecha || getFechaHoyLocal());

    const precio = await PrecioCuota.findOne({
      where: {
        activo: true,
        fecha_desde: {
          [Op.lte]: fechaRef
        }
      },
      order: [['fecha_desde', 'DESC']]
    });

    if (precio) {
      return parseFloat(precio.monto);
    }

    // Fallback: si no hay con fecha <= fechaRef, tomar el más cercano disponible
    const precioFallback = await PrecioCuota.findOne({
      where: { activo: true },
      order: [['fecha_desde', 'ASC']]
    });

    if (precioFallback) {
      return parseFloat(precioFallback.monto);
    }

    // Fallback general por defecto
    return 18000.00;
  } catch (error) {
    console.warn('⚠️ Error al obtener precio vigente de cuota, usando fallback:', error.message);
    return 18000.00;
  }
};

/**
 * Calcula el estado real de una cuota según la fecha actual o una fecha de referencia:
 * - 'pagado': si fecha_pago existe o estado ya es 'pagado'
 * - 'pendiente': si hoy <= fecha_vencimiento
 * - 'en demora': si fecha_vencimiento < hoy <= fecha_limite_pago (5 días de gracia tras vencerse el mes)
 * - 'no pagado': si hoy > fecha_limite_pago
 */
const calcularEstadoReal = (cuota, fechaReferencia = null) => {
  if (cuota.fecha_pago || cuota.estado === 'pagado') {
    return 'pagado';
  }

  const hoyStr = aFechaStr(fechaReferencia || getFechaHoyLocal());
  const vencStr = aFechaStr(cuota.fecha_vencimiento);
  const limiteStr = aFechaStr(cuota.fecha_limite_pago);

  if (hoyStr <= vencStr) {
    return 'pendiente';
  }

  if (hoyStr > vencStr && hoyStr <= limiteStr) {
    return 'en demora';
  }

  return 'no pagado';
};

/**
 * Genera automáticamente 5 cuotas iniciales correspondientes a los próximos 5 meses desde la inscripción.
 */
const generarCuotasIniciales = async (usuarioId, fechaInscripcion = null) => {
  try {
    if (!usuarioId) {
      throw new Error('usuarioId es obligatorio para generar cuotas');
    }

    // Verificar el usuario en la BD. Si rol !== 'usuario', no generar cuotas y retornar []
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario || usuario.rol !== 'usuario') {
      return [];
    }

    // Verificar si el usuario ya posee cuotas creadas
    const cuotasExistentes = await Cuota.findAll({
      where: { usuario_id: usuarioId },
      order: [['numero_cuota', 'ASC']]
    });

    if (cuotasExistentes.length >= 5) {
      return cuotasExistentes;
    }

    const fechaBase = aFechaStr(fechaInscripcion || usuario.fecha_inscripcion || getFechaHoyLocal());
    const cuotasACrear = [];
    const numerosExistentes = new Set(cuotasExistentes.map((c) => c.numero_cuota));

    for (let i = 1; i <= 5; i++) {
      if (numerosExistentes.has(i)) {
        continue;
      }

      // Emisión: día de inscripción + (i-1) meses
      const fechaEmision = sumarMeses(fechaBase, i - 1);
      // Vencimiento: 1 mes exacto después de la fecha de emisión
      const fechaVencimiento = sumarMeses(fechaBase, i);
      // Límite de pago: 5 días después de la fecha de vencimiento
      const fechaLimitePago = sumarDias(fechaVencimiento, 5);
      // Periodo: mes y año de la cuota
      const periodo = formatearPeriodo(fechaEmision);

      const monto = await obtenerPrecioVigenteParaFecha(fechaVencimiento);
      const estado = calcularEstadoReal({
        fecha_vencimiento: fechaVencimiento,
        fecha_limite_pago: fechaLimitePago,
        estado: 'pendiente'
      });

      cuotasACrear.push({
        usuario_id: usuarioId,
        numero_cuota: i,
        periodo,
        monto,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        fecha_limite_pago: fechaLimitePago,
        estado
      });
    }

    let nuevasCuotas = [];
    if (cuotasACrear.length > 0) {
      nuevasCuotas = await Cuota.bulkCreate(cuotasACrear);
      console.log(`✅ ${nuevasCuotas.length} cuotas iniciales creadas para el usuario ${usuarioId}`);
    }

    const todas = await Cuota.findAll({
      where: { usuario_id: usuarioId },
      order: [['numero_cuota', 'ASC']]
    });

    return todas;
  } catch (error) {
    console.error(`❌ Error en generarCuotasIniciales para usuario ${usuarioId}:`, error);
    throw error;
  }
};

/**
 * Verifica las cuotas del usuario y genera nuevas cuotas mensuales para que siempre cuente
 * con la cuota del mes siguiente o mantenga las cuotas al día si avanzó el tiempo.
 */
const asegurarCuotasMensuales = async (usuarioId) => {
  try {
    if (!usuarioId) return [];

    // Verificar el usuario. Si rol !== 'usuario', no generar nada y retornar []
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario || usuario.rol !== 'usuario') {
      return [];
    }

    const cuotas = await Cuota.findAll({
      where: { usuario_id: usuarioId },
      order: [['numero_cuota', 'ASC']]
    });

    if (cuotas.length === 0) {
      const fechaBase = usuario.fecha_inscripcion || getFechaHoyLocal();
      return await generarCuotasIniciales(usuarioId, fechaBase);
    }

    // Obtener la última cuota existente
    let ultimaCuota = cuotas[cuotas.length - 1];
    const hoyStr = getFechaHoyLocal();
    // Queremos que siempre exista como mínimo una cuota para el próximo mes
    const fechaObjetivo = sumarMeses(hoyStr, 1);

    while (ultimaCuota.fecha_vencimiento < fechaObjetivo) {
      const nuevoNumero = ultimaCuota.numero_cuota + 1;
      const fechaEmision = ultimaCuota.fecha_vencimiento;
      const fechaVencimiento = sumarMeses(fechaEmision, 1);
      const fechaLimitePago = sumarDias(fechaVencimiento, 5);
      const periodo = formatearPeriodo(fechaEmision);
      const monto = await obtenerPrecioVigenteParaFecha(fechaVencimiento);
      const estado = calcularEstadoReal({
        fecha_vencimiento: fechaVencimiento,
        fecha_limite_pago: fechaLimitePago,
        estado: 'pendiente'
      });

      ultimaCuota = await Cuota.create({
        usuario_id: usuarioId,
        numero_cuota: nuevoNumero,
        periodo,
        monto,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        fecha_limite_pago: fechaLimitePago,
        estado
      });
      console.log(`✅ Cuota mensual subsecuente N° ${nuevoNumero} (${periodo}) creada para usuario ${usuarioId}`);
    }

    // Actualizar estados
    await actualizarEstadosCuotas(usuarioId);

    return await Cuota.findAll({
      where: { usuario_id: usuarioId },
      order: [['numero_cuota', 'ASC']]
    });
  } catch (error) {
    console.error(`❌ Error en asegurarCuotasMensuales para usuario ${usuarioId}:`, error);
    throw error;
  }
};

/**
 * Evalúa y actualiza en BD los estados de las cuotas que no estén pagadas según la fecha actual.
 * Puede ejecutarse para un usuario específico o para todas las cuotas de la base de datos.
 */
const actualizarEstadosCuotas = async (usuarioId = null) => {
  try {
    const whereClause = {
      estado: {
        [Op.ne]: 'pagado'
      }
    };

    if (usuarioId) {
      whereClause.usuario_id = usuarioId;
    }

    const cuotasNoPagadas = await Cuota.findAll({ where: whereClause });
    const hoyStr = getFechaHoyLocal();
    let actualizadas = 0;

    for (const cuota of cuotasNoPagadas) {
      const nuevoEstado = calcularEstadoReal(cuota, hoyStr);
      if (cuota.estado !== nuevoEstado) {
        await cuota.update({ estado: nuevoEstado });
        actualizadas++;
      }
    }

    return { totalEvaluadas: cuotasNoPagadas.length, actualizadas };
  } catch (error) {
    console.error('❌ Error en actualizarEstadosCuotas:', error);
    throw error;
  }
};

/**
 * Evalúa el estado de cobranza global de un usuario:
 * - Si rol !== 'usuario', retorna { estadoCuota: 'N/A', demorado: false, alDia: true, cantVencidas: 0, cuotasVencidas: [] }
 * - Si tiene alguna cuota en 'no pagado': estadoCuota: 'Con Deuda', alDia: false, demorado: false
 * - Si no tiene 'no pagado' pero tiene alguna en 'en demora': estadoCuota: 'Demorado', alDia: false, demorado: true
 * - Si todas las cuotas vencidas están pagadas (o sólo tiene pendientes a futuro): estadoCuota: 'Al Día', alDia: true, demorado: false
 */
const obtenerEstadoCobranzaUsuario = async (usuarioId) => {
  try {
    if (!usuarioId) {
      return {
        estadoCuota: 'N/A',
        demorado: false,
        alDia: true,
        cantVencidas: 0,
        cuotasVencidas: []
      };
    }

    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario || usuario.rol !== 'usuario') {
      return {
        estadoCuota: 'N/A',
        demorado: false,
        alDia: true,
        cantVencidas: 0,
        cuotasVencidas: []
      };
    }

    // Actualizar estados de cuotas
    await actualizarEstadosCuotas(usuarioId);

    const cuotas = await Cuota.findAll({
      where: { usuario_id: usuarioId },
      order: [['fecha_vencimiento', 'ASC'], ['numero_cuota', 'ASC']]
    });

    const cuotasVencidas = cuotas
      .filter((c) => c.estado === 'en demora' || c.estado === 'no pagado')
      .map((c) => (typeof c.toJSON === 'function' ? c.toJSON() : c));

    const tieneNoPagado = cuotas.some((c) => c.estado === 'no pagado');
    const tieneEnDemora = cuotas.some((c) => c.estado === 'en demora');

    let estadoCuota = 'Al Día';
    let alDia = true;
    let demorado = false;

    if (tieneNoPagado) {
      estadoCuota = 'Con Deuda';
      alDia = false;
      demorado = false;
    } else if (tieneEnDemora) {
      estadoCuota = 'Demorado';
      alDia = false;
      demorado = true;
    } else {
      estadoCuota = 'Al Día';
      alDia = true;
      demorado = false;
    }

    return {
      estadoCuota,
      demorado,
      alDia,
      cantVencidas: cuotasVencidas.length,
      cuotasVencidas
    };
  } catch (error) {
    console.error(`❌ Error en obtenerEstadoCobranzaUsuario para ${usuarioId}:`, error);
    return {
      estadoCuota: 'Al Día',
      demorado: false,
      alDia: true,
      cantVencidas: 0,
      cuotasVencidas: []
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
  generarCuotasIniciales,
  asegurarCuotasMensuales,
  actualizarEstadosCuotas,
  obtenerEstadoCobranzaUsuario
};
