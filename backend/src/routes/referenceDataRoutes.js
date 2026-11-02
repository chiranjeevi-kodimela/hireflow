const router = require("express").Router();
const controller = require("../controllers/referenceDataController");

router.get("/employees", controller.getEmployees);
router.get("/interview-panels", controller.getInterviewPanels);
router.get("/evaluation-criteria", controller.getEvaluationCriteria);

module.exports = router;
