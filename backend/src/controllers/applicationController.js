const applicationService = require("../services/applicationService");

const createApplication = async (req, res, next) => {
  try {
    const application = await applicationService.createApplication(req.body);

    res.status(201).json({
      success: true,
      message: "Application created successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

const getAllApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.getAllApplications();

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

const getApplicationById = async (req, res, next) => {
  try {
    const application = await applicationService.getApplicationById(
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApplication,
  getAllApplications,
  getApplicationById,
};
