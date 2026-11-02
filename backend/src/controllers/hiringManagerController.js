const hiringManagerService = require("../services/hiringManagerService");

const getActiveHiringManagers = async (req, res, next) => {
  try {
    const managers = await hiringManagerService.getActiveHiringManagers();

    res.status(200).json({
      success: true,
      count: managers.length,
      data: managers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getActiveHiringManagers };
