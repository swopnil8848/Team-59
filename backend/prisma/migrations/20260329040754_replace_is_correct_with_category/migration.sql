/*
  Warnings:

  - You are about to drop the column `isCorrect` on the `GameQuestionAnswer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GameQuestionAnswer" DROP COLUMN "isCorrect",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'incorrect';
