const candidateService = require("../services/candidateService");

const createCandidate = async (req, res, next) => {
  try {
    const candidate = await candidateService.createCandidate(req.body);

    res.status(201).json({
      success: true,
      message: "Candidate created successfully",
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCandidates = async (req, res, next) => {
  try {
    const candidates = await candidateService.getAllCandidates();

    res.status(200).json({
      success: true,
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    next(error);
  }
};

const getCandidateById = async (req, res, next) => {
  try {
    const candidate = await candidateService.getCandidateById(req.params.id);

    res.status(200).json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

const updateCandidate = async (req, res, next) => {
  try {
    const candidate = await candidateService.updateCandidate(
      req.params.id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Candidate updated successfully",
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCandidate,
  getAllCandidates,
  getCandidateById,
  updateCandidate,
};
