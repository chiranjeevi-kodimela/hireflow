const router = require("express").Router();
const controller = require("../controllers/interviewController");

router.post("/", controller.create);

module.exports = router;