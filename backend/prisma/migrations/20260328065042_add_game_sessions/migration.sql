-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "generationContext" JSONB,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "isSolvedByUser" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameQuestionAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameUserResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedAnswerId" TEXT,
    "answeredAt" TIMESTAMP(3),
    "responseTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameUserResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSession_userId_createdAt_idx" ON "GameSession"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GameSession_status_idx" ON "GameSession"("status");

-- CreateIndex
CREATE INDEX "GameQuestion_sessionId_status_idx" ON "GameQuestion"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GameQuestion_sessionId_order_key" ON "GameQuestion"("sessionId", "order");

-- CreateIndex
CREATE INDEX "GameQuestionAnswer_questionId_idx" ON "GameQuestionAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameUserResponse_questionId_key" ON "GameUserResponse"("questionId");

-- CreateIndex
CREATE INDEX "GameUserResponse_sessionId_idx" ON "GameUserResponse"("sessionId");

-- CreateIndex
CREATE INDEX "GameUserResponse_selectedAnswerId_idx" ON "GameUserResponse"("selectedAnswerId");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestionAnswer" ADD CONSTRAINT "GameQuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameUserResponse" ADD CONSTRAINT "GameUserResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameUserResponse" ADD CONSTRAINT "GameUserResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "GameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameUserResponse" ADD CONSTRAINT "GameUserResponse_selectedAnswerId_fkey" FOREIGN KEY ("selectedAnswerId") REFERENCES "GameQuestionAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
