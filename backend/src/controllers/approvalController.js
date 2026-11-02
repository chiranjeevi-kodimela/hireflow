const { decideApproval } = require("../services/approvalService");

const decide = async (req, res, next) => {
  try {
    const data = await decideApproval(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Approval decision recorded",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { decide };
