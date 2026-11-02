const { createOffer } = require("../services/offerService");

const create = async (req, res, next) => {
  try {
    const data = await createOffer(req.body);
    res.status(201).json({
      success: true,
      message: "Offer created and sent for approval",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { create };