const prisma = require("../config/database");

const createCandidate = async (data) => {
  const {
    fullName,
    email,
    phone,
    location,
    experienceYears,
    currentCompany,
    resumeUrl,
  } = data;

  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    experienceYears === undefined
  ) {
    const error = new Error("Full name, email and experience are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!validEmail.test(normalizedEmail)) {
    const error = new Error("Invalid email address");
    error.statusCode = 400;
    throw error;
  }

  const experience = Number(experienceYears);

  if (!Number.isFinite(experience) || experience < 0 || experience > 99.9) {
    const error = new Error("Experience must be between 0 and 99.9 years");
    error.statusCode = 400;
    throw error;
  }

  if (phone !== undefined && phone !== null && typeof phone !== "string") {
    const error = new Error("Phone must be a string");
    error.statusCode = 400;
    throw error;
  }

  if (
    resumeUrl &&
    (typeof resumeUrl !== "string" || !/^https?:\/\/\S+$/i.test(resumeUrl))
  ) {
    const error = new Error("Resume URL must be a valid HTTP or HTTPS URL");
    error.statusCode = 400;
    throw error;
  }

  try {
    return await prisma.candidate.create({
      data: {
        candidateId: `CAND-${Date.now()}`,
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        location: location?.trim() || null,
        experienceYears: experience,
        currentCompany: currentCompany?.trim() || null,
        resumeUrl: resumeUrl || null,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      const duplicateError = new Error(
        "A candidate with this email already exists",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

const getAllCandidates = async () => {
  return prisma.candidate.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getCandidateById = async (candidateId) => {
  const candidate = await prisma.candidate.findUnique({
    where: { candidateId },
    include: {
      applications: true,
    },
  });

  if (!candidate) {
    const error = new Error("Candidate not found");
    error.statusCode = 404;
    throw error;
  }

  return candidate;
};

const updateCandidate = async (candidateId, data) => {
  const existing = await prisma.candidate.findUnique({
    where: { candidateId },
  });

  if (!existing) {
    const error = new Error("Candidate not found");
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    "fullName",
    "email",
    "phone",
    "location",
    "experienceYears",
    "currentCompany",
    "resumeUrl",
  ];

  const updateData = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    const error = new Error("No valid fields provided");
    error.statusCode = 400;
    throw error;
  }

  if (updateData.fullName !== undefined) {
    if (
      typeof updateData.fullName !== "string" ||
      !updateData.fullName.trim()
    ) {
      const error = new Error("Full name cannot be empty");
      error.statusCode = 400;
      throw error;
    }

    updateData.fullName = updateData.fullName.trim();
  }

  if (updateData.email !== undefined) {
    if (typeof updateData.email !== "string") {
      const error = new Error("Invalid email address");
      error.statusCode = 400;
      throw error;
    }

    updateData.email = updateData.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
      const error = new Error("Invalid email address");
      error.statusCode = 400;
      throw error;
    }
  }

  if (updateData.experienceYears !== undefined) {
    const experience = Number(updateData.experienceYears);

    if (!Number.isFinite(experience) || experience < 0 || experience > 99.9) {
      const error = new Error("Invalid experience value");
      error.statusCode = 400;
      throw error;
    }

    updateData.experienceYears = experience;
  }

  if (updateData.resumeUrl !== undefined && updateData.resumeUrl !== null) {
    if (
      typeof updateData.resumeUrl !== "string" ||
      !/^https?:\/\/\S+$/i.test(updateData.resumeUrl)
    ) {
      const error = new Error("Invalid resume URL");
      error.statusCode = 400;
      throw error;
    }
  }

  if (updateData.phone !== undefined && updateData.phone !== null) {
    if (typeof updateData.phone !== "string") {
      const error = new Error("Phone must be a string");
      error.statusCode = 400;
      throw error;
    }

    updateData.phone = updateData.phone.trim();
  }

  for (const field of ["location", "currentCompany"]) {
    if (updateData[field] !== undefined && updateData[field] !== null) {
      if (typeof updateData[field] !== "string") {
        const error = new Error(`${field} must be a string`);
        error.statusCode = 400;
        throw error;
      }

      updateData[field] = updateData[field].trim();
    }
  }

  try {
    return await prisma.candidate.update({
      where: { candidateId },
      data: updateData,
    });
  } catch (error) {
    if (error.code === "P2002") {
      const duplicateError = new Error(
        "A candidate with this email already exists",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

module.exports = {
  createCandidate,
  getAllCandidates,
  getCandidateById,
  updateCandidate,
};
