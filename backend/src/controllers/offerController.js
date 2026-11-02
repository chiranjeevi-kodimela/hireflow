const { createOffer, getAllOffers } = require("../services/offerService");

const getAll = async (req, res, next) => {
  try {
    const data = await getAllOffers();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

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

module.exports = { getAll, create };
