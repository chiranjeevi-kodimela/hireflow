const { createInterview } = require("../services/interviewService");

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

module.exports = { create };