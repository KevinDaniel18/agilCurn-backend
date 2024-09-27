/*
  Warnings:

  - Added the required column `uploaderId` to the `ProjectDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable

ALTER TABLE "ProjectDocument" ADD COLUMN     "uploaderId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
