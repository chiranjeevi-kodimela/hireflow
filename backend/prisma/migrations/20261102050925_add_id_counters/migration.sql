-- CreateTable
CREATE TABLE "IdCounter" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdCounter_pkey" PRIMARY KEY ("name")
);
