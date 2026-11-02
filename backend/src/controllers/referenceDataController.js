const referenceDataService = require("../services/referenceDataService");

const getEmployees = async (req, res, next) => {
  try {
    const data = await referenceDataService.getEmployees();

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getInterviewPanels = async (req, res, next) => {
  try {
    const data = await referenceDataService.getInterviewPanels(
      req.query.requisitionId,
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getEvaluationCriteria = async (req, res, next) => {
  try {
    const data = await referenceDataService.getEvaluationCriteria(
      req.query.requisitionId,
    );

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployees,
  getInterviewPanels,
  getEvaluationCriteria,
};
