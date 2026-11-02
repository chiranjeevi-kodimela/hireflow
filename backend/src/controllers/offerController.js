const {
  createOffer,
  getAllOffers,
  sendOffer,
  respondToOffer,
  withdrawOffer,
} = require("../services/offerService");

const getAll = async (req, res, next) => {
  try {
    const data = await getAllOffers();
    res.status(200).json({ success: true, data });
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

const send = async (req, res, next) => {
  try {
    const data = await sendOffer(req.params.id);
    res.status(200).json({
      success: true,
      message: "Offer sent successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const respond = async (req, res, next) => {
  try {
    const data = await respondToOffer(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Offer response recorded",
      data,
    });
  } catch (error) {
    next(error);
  }
};

const withdraw = async (req, res, next) => {
  try {
    const data = await withdrawOffer(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Offer withdrawn",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  create,
  send,
  respond,
  withdraw,
};
