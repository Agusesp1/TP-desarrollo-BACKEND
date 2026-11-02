const Branch = require('../models/branch.model');
const { Op } = require('sequelize');

// Validar parámetro ID y verificar existencia de la sede en BD
const validateIdSede = async (req, res, next) => {
  const { id } = req.params;

  if (!id || isNaN(id) || parseInt(id, 10) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'El identificador de la sede no es válido'
    });
  }

  try {
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'La sede solicitada no existe o fue dada de baja'
      });
    }

    req.branch = branch;
    next();
  } catch (error) {
    next(error);
  }
};

// Validar datos para la creación de una nueva sede
const validateCrearSede = async (req, res, next) => {
  const { name, address, phone, capacity } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'El nombre de la sede es obligatorio'
    });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: 'El nombre de la sede no puede superar los 100 caracteres'
    });
  }

  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'La dirección de la sede es obligatoria'
    });
  }

  if (phone !== undefined && phone !== null && phone.toString().trim() !== '') {
    if (!/^\d+$/.test(phone.toString().trim())) {
      return res.status(400).json({
        success: false,
        message: 'El número de teléfono de la sede solo debe contener números'
      });
    }
  }

  if (capacity !== undefined && capacity !== null) {
    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La capacidad de la sede debe ser un número entero mayor a 0'
      });
    }
  }

  try {
    const nombreExistente = await Branch.findOne({
      where: { name: name.trim() }
    });

    if (nombreExistente) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una sede registrada con ese nombre'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validar datos para la actualización de una sede
const validateActualizarSede = async (req, res, next) => {
  const { id } = req.params;
  const { name, phone, capacity } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la sede no puede estar vacío'
      });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la sede no puede superar los 100 caracteres'
      });
    }
  }

  if (phone !== undefined && phone !== null && phone.toString().trim() !== '') {
    if (!/^\d+$/.test(phone.toString().trim())) {
      return res.status(400).json({
        success: false,
        message: 'El número de teléfono de la sede solo debe contener números'
      });
    }
  }

  if (capacity !== undefined && capacity !== null) {
    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La capacidad de la sede debe ser un número entero mayor a 0'
      });
    }
  }

  try {
    if (name) {
      const nombreEnUso = await Branch.findOne({
        where: {
          name: name.trim(),
          id: { [Op.ne]: id }
        }
      });

      if (nombreEnUso) {
        return res.status(409).json({
          success: false,
          message: 'Ya existe otra sede con ese nombre'
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateIdSede,
  validateCrearSede,
  validateActualizarSede
};
