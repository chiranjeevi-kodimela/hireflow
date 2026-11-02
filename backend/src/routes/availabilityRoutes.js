const router = require("express").Router();
const controller = require("../controllers/availabilityController");

router.post("/", controller.create);
router.get("/:id", controller.getByInterviewer);

module.exports = router;