const service = require("../services/availabilityService");

const create = async (req, res, next) => {
  try {
    const data = await service.createAvailability(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getByInterviewer = async (req, res, next) => {
  try {
    const data = await service.getInterviewerAvailability(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getByInterviewer };
