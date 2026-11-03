const prisma = require("../../src/config/database");

const run = async () => {
  try {
    const models = Object.keys(prisma._runtimeDataModel.models);
    const populated = [];
    for (const model of models) {
      const delegateName = model[0].toLowerCase() + model.slice(1);
      const count = await prisma[delegateName].count();
      if (count) populated.push(`${model}: ${count}`);
    }

    if (populated.length) {
      throw new Error(
        `Dataset generation requires an empty database. Found records in ${populated.join(", ")}`,
      );
    }
    console.log("Database is empty; dataset generation can proceed.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
