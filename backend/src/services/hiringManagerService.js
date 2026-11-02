const prisma = require("../config/database");

const getActiveHiringManagers = async () => {
  return prisma.hiringManager.findMany({
    where: {
      isActive: true,
      employee: {
        isActive: true,
      },
    },
    select: {
      hiringManagerId: true,
      employeeId: true,
      designation: true,
      employee: {
        select: {
          fullName: true,
          email: true,
          department: true,
        },
      },
    },
    orderBy: {
      employee: {
        fullName: "asc",
      },
    },
  });
};

module.exports = { getActiveHiringManagers };
