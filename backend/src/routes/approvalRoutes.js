const router = require("express").Router();
const controller = require("../controllers/approvalController");

router.patch("/:id/decision", controller.decide);

module.exports = router;