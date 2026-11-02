const router = require("express").Router();
const controller = require("../controllers/offerController");

router.post("/", controller.create);
router.get("/", controller.getAll);

router.patch("/:id/send", controller.send);
router.patch("/:id/respond", controller.respond);
router.patch("/:id/withdraw", controller.withdraw);

module.exports = router;
