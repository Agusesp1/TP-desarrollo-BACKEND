const Quota = require('../models/quota.model');
const User = require('../models/user.model');

// Validar y verificar usuario para consulta de cuotas
const validateObtenerMisCuotas = async (req, res, next) => {
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
        message: 'Se requiere el identificador del usuario para consultar las cuotas'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (user.role === 'admin' || user.role === 'teacher') {
      return res.json({
        success: false,
        message: 'Los administradores y profesores no poseen cuotas asignadas.'
      });
    }

    req.targetUser = user;
    req.targetUserId = userId;
    next();
  } catch (error) {
    next(error);
  }
};

// Validar creación o actualización de precio programado
const validateCrearPrecioCuota = (req, res, next) => {
  const { amount, start_date } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Debe ingresar un monto numérico válido y mayor a 0'
    });
  }

  if (!start_date) {
    return res.status(400).json({
      success: false,
      message: 'La fecha de entrada en vigencia es obligatoria'
    });
  }

  next();
};

// Validar cuota para pago manual
const validatePagoManual = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.quota_id || req.body.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'El identificador de la cuota es obligatorio'
      });
    }

    const quota = await Quota.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!quota) {
      return res.status(404).json({
        success: false,
        message: 'Cuota no encontrada'
      });
    }

    if (quota.status === 'pagado') {
      return res.status(400).json({
        success: false,
        message: 'Esta cuota ya ha sido pagada previamente'
      });
    }

    req.quota = quota;
    next();
  } catch (error) {
    next(error);
  }
};

// Validar generación de preferencia de Mercado Pago
const validatePreferenciaMP = async (req, res, next) => {
  try {
    const quotaId = req.params.id || req.body.quota_id || req.body.id;

    if (!quotaId) {
      return res.status(400).json({
        success: false,
        message: 'El identificador de la cuota es obligatorio'
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
        message: 'Cuota no encontrada'
      });
    }

    if (quota.status === 'pagado') {
      return res.status(400).json({
        success: false,
        message: 'Esta cuota ya se encuentra pagada'
      });
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'Mercado Pago no está configurado en el servidor (falta Access Token).'
      });
    }

    req.quota = quota;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateObtenerMisCuotas,
  validateCrearPrecioCuota,
  validatePagoManual,
  validatePreferenciaMP
};
