const router = require("express").Router();
const controller = require("../controllers/offerController");

router.post("/", controller.create);

module.exports = router;