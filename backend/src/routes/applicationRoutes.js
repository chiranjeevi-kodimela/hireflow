const express = require("express");

const {
  createApplication,
  getAllApplications,
  getApplicationById,
} = require("../controllers/applicationController");

const router = express.Router();

router.route("/").post(createApplication).get(getAllApplications);

router.route("/:id").get(getApplicationById);

module.exports = router;
