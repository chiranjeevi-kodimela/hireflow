const {
  updateApplicationStage,
} = require("../services/applicationStageService");

const changeStage = async (req, res, next) => {
  try {
    const application = await updateApplicationStage(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Application stage updated successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { changeStage };
