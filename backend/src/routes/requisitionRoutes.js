const express = require("express");

const {
  createRequisition,
  getAllRequisitions,
  getRequisitionById,
  updateRequisition,
  changeStatus,
} = require("../controllers/requisitionController");

const router = express.Router();

router.route("/").post(createRequisition).get(getAllRequisitions);

router.route("/:id").get(getRequisitionById).patch(updateRequisition);

router.patch("/:id/status", changeStatus);

module.exports = router;
