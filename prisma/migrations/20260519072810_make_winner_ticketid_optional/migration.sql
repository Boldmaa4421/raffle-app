/*
  Warnings:

  - You are about to drop the column `smsError` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `smsSentAt` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `smsStatus` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the `AdminSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Winner" DROP CONSTRAINT "Winner_ticketId_fkey";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "smsError",
DROP COLUMN "smsSentAt",
DROP COLUMN "smsStatus";

-- AlterTable
ALTER TABLE "Winner" ALTER COLUMN "ticketId" DROP NOT NULL;

-- DropTable
DROP TABLE "AdminSession";

-- CreateIndex
CREATE INDEX "Purchase_raffleId_idx" ON "Purchase"("raffleId");

-- CreateIndex
CREATE INDEX "Purchase_phoneE164_idx" ON "Purchase"("phoneE164");

-- CreateIndex
CREATE INDEX "Purchase_raffleId_phoneE164_idx" ON "Purchase"("raffleId", "phoneE164");

-- AddForeignKey
ALTER TABLE "Winner" ADD CONSTRAINT "Winner_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
