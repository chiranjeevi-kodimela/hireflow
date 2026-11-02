const prisma = require("../config/database");

const generateId = async (counterName, prefix, year = null) => {
  const counter = await prisma.idCounter.upsert({
    where: { name: counterName },
    create: {
      name: counterName,
      value: 1,
    },
    update: {
      value: {
        increment: 1,
      },
    },
  });

  const number = String(counter.value).padStart(6, "0");

  return year ? `${prefix}-${year}-${number}` : `${prefix}-${number}`;
};

module.exports = { generateId };
