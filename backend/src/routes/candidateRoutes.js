const express = require("express");

const {
  createCandidate,
  getAllCandidates,
  getCandidateById,
  updateCandidate,
} = require("../controllers/candidateController");

const router = express.Router();

router
  .route("/")
  .post(createCandidate)
  .get(getAllCandidates);

router
  .route("/:id")
  .get(getCandidateById)
  .patch(updateCandidate);

module.exports = router;