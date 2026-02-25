-- CreateEnum
CREATE TYPE "ReimbursementAttachmentType" AS ENUM ('SUBMISSION', 'PAYMENT');

-- AlterTable
ALTER TABLE "reimbursementAttachment" ADD COLUMN     "type" "ReimbursementAttachmentType" NOT NULL DEFAULT 'SUBMISSION';
