const { createScorecard } = require("../services/scorecardService");

const create = async (req, res, next) => {
  try {
    const data = await createScorecard(req.body);
    res.status(201).json({
      success: true,
      message: "Scorecard submitted successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { create };
