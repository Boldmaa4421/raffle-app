/*
  Warnings:

  - You are about to drop the column `phoneE164` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `seq` on the `Ticket` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Ticket_phoneE164_idx";

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "phoneE164",
DROP COLUMN "seq";
