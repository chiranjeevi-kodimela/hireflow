const requisitionService = require("../services/requisitionService");

const createRequisition = async (req, res, next) => {
  try {
    const requisition = await requisitionService.createRequisition(req.body);

    res.status(201).json({
      success: true,
      message: "Requisition created successfully",
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

const getAllRequisitions = async (req, res, next) => {
  try {
    const requisitions = await requisitionService.getAllRequisitions({
      status: req.query.status,
      department: req.query.department,
    });

    res.status(200).json({
      success: true,
      count: requisitions.length,
      data: requisitions,
    });
  } catch (error) {
    next(error);
  }
};

const getRequisitionById = async (req, res, next) => {
  try {
    const requisition = await requisitionService.getRequisitionById(
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

const updateRequisition = async (req, res, next) => {
  try {
    const requisition = await requisitionService.updateRequisition(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Requisition updated successfully",
      data: requisition,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequisition,
  getAllRequisitions,
  getRequisitionById,
  updateRequisition,
};