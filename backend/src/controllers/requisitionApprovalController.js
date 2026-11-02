const {
  submitRequisition,
} = require("../services/requisitionApprovalService");

const submit = async (req, res, next) => {
  try {
    const data = await submitRequisition(
      req.params.id,
      req.body.submittedById
    );

    res.status(200).json({
      success: true,
      message: "Requisition submitted for approval",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { submit };