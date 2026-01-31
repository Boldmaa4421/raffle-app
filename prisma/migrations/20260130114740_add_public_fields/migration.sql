/*
  Warnings:

  - You are about to drop the column `drawAt` on the `Raffle` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Raffle` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Raffle` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Raffle" DROP COLUMN "drawAt",
DROP COLUMN "status",
DROP COLUMN "updatedAt",
ADD COLUMN     "fbUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "payAccount" TEXT,
ADD COLUMN     "payBankLabel" TEXT,
ADD COLUMN     "totalTickets" INTEGER,
ALTER COLUMN "title" DROP NOT NULL;
