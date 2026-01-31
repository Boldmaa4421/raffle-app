/*
  Warnings:

  - You are about to drop the column `claimPhotoUrl` on the `Winner` table. All the data in the column will be lost.
  - You are about to drop the column `fbLiveUrl` on the `Winner` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Winner` table. All the data in the column will be lost.
  - You are about to drop the column `prizeText` on the `Winner` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Winner` table. All the data in the column will be lost.
  - You are about to drop the column `winnerName` on the `Winner` table. All the data in the column will be lost.
  - You are about to drop the column `winnerPhone` on the `Winner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Winner" DROP COLUMN "claimPhotoUrl",
DROP COLUMN "fbLiveUrl",
DROP COLUMN "notes",
DROP COLUMN "prizeText",
DROP COLUMN "updatedAt",
DROP COLUMN "winnerName",
DROP COLUMN "winnerPhone",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "facebookLiveUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3);
