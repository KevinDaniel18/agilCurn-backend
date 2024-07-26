-- CreateTable
CREATE TABLE "InvitationToProject" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "invitedId" INTEGER NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationToProject_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvitationToProject" ADD CONSTRAINT "InvitationToProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationToProject" ADD CONSTRAINT "InvitationToProject_invitedId_fkey" FOREIGN KEY ("invitedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
