const { createInterview,
        cancelInterview,
        rescheduleInterview,
        completeInterview
 } = require("../services/interviewService");

const create = async (req, res, next) => {
  try {
    const data = await createInterview(req.body);
    res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};


const complete = async (req, res, next) => {
  try {
    const data = await completeInterview(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Interview completed successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const data = await cancelInterview(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Interview cancelled successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
const getAll = async (req, res, next) => {
  try {
    const data = await require("../services/interviewService")
      .getAllInterviews(req.query);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};
const reschedule = async (req, res, next) => {
  try {
    const data = await rescheduleInterview(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Interview rescheduled successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = { create, complete, cancel, reschedule, getAll };