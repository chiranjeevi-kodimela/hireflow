const prisma = require("../../src/config/database");
const { createRandom } = require("./random");

const random = createRandom(20261022);

const firstNames = [
  "Aarav",
  "Vihaan",
  "Aditya",
  "Arjun",
  "Ishaan",
  "Rohan",
  "Kiran",
  "Rahul",
  "Ananya",
  "Diya",
  "Meera",
  "Priya",
  "Sneha",
  "Aadhya",
  "Kavya",
  "Vikram",
  "Neha",
  "Sanjay",
  "Pooja",
  "Varun",
];

const lastNames = [
  "Sharma",
  "Reddy",
  "Patel",
  "Kumar",
  "Rao",
  "Verma",
  "Gupta",
  "Nair",
  "Das",
  "Mehta",
  "Singh",
  "Iyer",
  "Joshi",
  "Mishra",
  "Kapoor",
];

const locations = [
  "Hyderabad",
  "Bangalore",
  "Chennai",
  "Pune",
  "Mumbai",
  "Delhi",
  "Vijayawada",
  "Visakhapatnam",
  "Kochi",
  "Remote",
];

const companies = [
  "TechNova",
  "CloudBridge",
  "DataWorks",
  "InnovateLabs",
  "NextGen Systems",
  "DigitalSphere",
  "CodeCraft",
  "ByteSolutions",
  "FutureStack",
  "OpenTech",
];

const generateCandidates = async () => {
  let generated = 0;

  for (let i = 1; i <= 5000; i++) {
    const candidateId = `SYN-CAND-${String(i).padStart(6, "0")}`;
    const email = `candidate${i}@hireflow.test`;

    await prisma.candidate.upsert({
      where: { email },
      update: {},
      create: {
        candidateId,
        fullName: `${random.pick(firstNames)} ${random.pick(lastNames)}`,
        email,
        phone: `9${String(100000000 + i).slice(-9)}`,
        location: random.pick(locations),
        experienceYears: random.integer(0, 200) / 10,
        currentCompany: random.pick(companies),
        resumeUrl: `https://example.com/resumes/${candidateId}.pdf`,
      },
    });

    generated++;

    if (i % 500 === 0) {
      console.log(`Processed ${i}/5000 candidates`);
    }
  }

  console.log(`Candidates generated: ${generated}`);
};

generateCandidates()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
