const router = require("express").Router();

const {
  getActiveHiringManagers,
} = require("../controllers/hiringManagerController");

router.get("/", getActiveHiringManagers);

module.exports = router;
