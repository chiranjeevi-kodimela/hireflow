const express = require("express");
const { changeStage } = require("../controllers/applicationStageController");

const router = express.Router();

router.patch("/:id/stage", changeStage);

module.exports = router;
