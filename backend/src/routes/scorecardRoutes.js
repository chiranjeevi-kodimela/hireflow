const router = require("express").Router();
const controller = require("../controllers/scorecardController");

router.post("/", controller.create);

module.exports = router;
