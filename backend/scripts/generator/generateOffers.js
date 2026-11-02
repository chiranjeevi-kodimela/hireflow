const prisma = require("../../src/config/database");
const {
  updateApplicationStage,
} = require("../../src/services/applicationStageService");
const { createOffer } = require("../../src/services/offerService");
const { decideApproval } = require("../../src/services/approvalService");

const MAX_OFFERS = 100;

const run = async () => {
  try {
    const hr = await prisma.employee.findFirst({
      where: { role: "HR", isActive: true },
    });

    if (!hr) {
      throw new Error("No active HR employee found");
    }

    const scorecards = await prisma.scorecard.findMany({
      where: {
        recommendation: {
          in: ["STRONG_YES", "YES"],
        },
        interview: {
          is: {
            status: "COMPLETED",
            application: {
              is: {
                status: "ACTIVE",
                currentStage: "SCREENING",
                candidateId: { startsWith: "SYN-CAND-" },
                requisitionId: { startsWith: "REQ-2026-9" },
              },
            },
          },
        },
      },
      include: {
        interview: {
          include: {
            application: {
              include: {
                requisition: true,
              },
            },
          },
        },
      },
      orderBy: { scorecardId: "asc" },
      take: MAX_OFFERS,
    });

    console.log(`Qualified candidates found: ${scorecards.length}`);

    let offersCreated = 0;
    let offersApproved = 0;
    let skipped = 0;

    for (const scorecard of scorecards) {
      const application = scorecard.interview.application;
      const requisition = application.requisition;

      try {
        const stages = ["TECHNICAL", "MANAGERIAL", "HR", "OFFER"];

        for (const stage of stages) {
          await updateApplicationStage(application.applicationId, {
            toStage: stage,
            changedById: hr.employeeId,
            reason: `Synthetic progression based on positive screening recommendation: ${scorecard.recommendation}`,
          });
        }

        const minSalary = Number(requisition.minSalary);
        const maxSalary = Number(requisition.maxSalary);

        const baseSalary = Math.round((minSalary + maxSalary) / 2);
        const bonus = Math.round(baseSalary * 0.1);

        const offer = await createOffer({
          applicationId: application.applicationId,
          baseSalary,
          bonus,
        });

        offersCreated++;

        for (const approval of offer.approvals) {
          await decideApproval(approval.approvalId, {
            approverId: approval.approverId,
            decision: "APPROVED",
            comments: "Synthetic baseline offer approval",
          });
        }

        const finalOffer = await prisma.offer.findUnique({
          where: { offerId: offer.offerId },
        });

        if (finalOffer?.status === "APPROVED") {
          offersApproved++;
        }

        if (offersCreated % 10 === 0) {
          console.log(`Offers created: ${offersCreated}/${scorecards.length}`);
        }
      } catch (error) {
        skipped++;
        console.error(`Skipped ${application.applicationId}: ${error.message}`);
      }
    }

    console.log("\nOffer generation completed");
    console.log(`Offers created: ${offersCreated}`);
    console.log(`Offers approved: ${offersApproved}`);
    console.log(`Applications skipped: ${skipped}`);
  } catch (error) {
    console.error("Offer generation failed:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
