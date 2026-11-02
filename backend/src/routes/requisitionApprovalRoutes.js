const router = require("express").Router();
const controller = require("../controllers/requisitionApprovalController");

router.post("/:id/submit", controller.submit);

module.exports = router;