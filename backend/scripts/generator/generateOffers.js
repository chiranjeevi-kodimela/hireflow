const prisma = require("../../src/config/database");
const config = require("./config");
const { createOffer } = require("../../src/services/offerService");
const { decideApproval } = require("../../src/services/approvalService");

const run = async () => {
  try {
    const scorecards = await prisma.scorecard.findMany({
      where: {
        recommendation: {
          in: ["STRONG_YES", "YES"],
        },
        interview: {
          is: {
            interviewType: "HR",
            status: "COMPLETED",
            application: {
              is: {
                status: "ACTIVE",
                currentStage: "OFFER",
                candidateId: { startsWith: "CAND-" },
                requisitionId: { startsWith: "REQ-2026-" },
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
    });

    const qualifiedApplications = [
      ...new Map(
        scorecards.map((scorecard) => [
          scorecard.interview.application.applicationId,
          scorecard,
        ]),
      ).values(),
    ].slice(0, config.followupApplications);

    console.log(`Qualified candidates found: ${qualifiedApplications.length}`);

    if (qualifiedApplications.length === 0) {
      throw new Error(
        "No qualified applications are at OFFER stage. Complete the required interview reviews first.",
      );
    }

    let offersCreated = 0;
    let offersApproved = 0;
    let skipped = 0;

    for (const scorecard of qualifiedApplications) {
      const application = scorecard.interview.application;
      const requisition = application.requisition;

      try {
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
          console.log(
            `Offers created: ${offersCreated}/${qualifiedApplications.length}`,
          );
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
