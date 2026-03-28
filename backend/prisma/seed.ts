import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type QuestionOption = {
  label: string;
  value: string;
};

type QuestionSeed = {
  key: string;
  pageNo: number;
  order: number;
  type:
    | "TEXT"
    | "TEXTAREA"
    | "SINGLE_SELECT"
    | "MULTI_SELECT"
    | "NUMBER"
    | "BOOLEAN";
  question: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: QuestionOption[];
};

type QuestionFile = {
  version: string;
  title: string;
  description: string;
  pages: Array<{ pageNo: number; title: string; description?: string }>;
  questions: QuestionSeed[];
};

async function main() {
  const prisma = new PrismaClient();
  const filePath = join(__dirname, "../src/onboarding/data/onboarding-questions.json");
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as QuestionFile;

  await prisma.$transaction(
    parsed.questions.map((question) =>
      prisma.onboardingQuestion.upsert({
        where: { key: question.key },
        create: {
          key: question.key,
          pageNo: question.pageNo,
          order: question.order,
          type: question.type,
          question: question.question,
          description: question.description ?? null,
          placeholder: question.placeholder ?? null,
          required: question.required,
          options: question.options ?? undefined,
          isActive: true
        },
        update: {
          pageNo: question.pageNo,
          order: question.order,
          type: question.type,
          question: question.question,
          description: question.description ?? null,
          placeholder: question.placeholder ?? null,
          required: question.required,
          options: question.options ?? undefined,
          isActive: true
        }
      })
    )
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
