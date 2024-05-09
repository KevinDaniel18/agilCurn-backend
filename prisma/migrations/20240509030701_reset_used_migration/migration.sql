/*
  Warnings:

  - You are about to drop the column `resetTokenUsed` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "resetTokenUsed",
ADD COLUMN     "resetUsed" BOOLEAN DEFAULT false;
