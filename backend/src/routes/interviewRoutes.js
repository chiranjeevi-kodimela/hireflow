const router = require("express").Router();
const controller = require("../controllers/interviewController");

router.post("/", controller.create);
router.patch("/:id/complete", controller.complete);
router.patch("/:id/cancel", controller.cancel);
router.patch("/:id/reschedule", controller.reschedule);
module.exports = router;