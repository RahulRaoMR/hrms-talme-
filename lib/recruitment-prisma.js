import { prisma } from "@/lib/prisma";

export function getRecruitmentPrisma() {
  return {
    jobOpening: prisma.jobOpening || null,
    recruiter: prisma.recruiter || null,
    harmonizedRole: prisma.harmonizedRole || null
  };
}

export async function safeCount(model, args) {
  if (!model?.count) {
    return 0;
  }

  return model.count(args);
}

export async function safeFindMany(model, args) {
  if (!model?.findMany) {
    return [];
  }

  return model.findMany(args);
}

export async function safeCreateMany(model, args) {
  if (!model?.createMany) {
    return { count: 0 };
  }

  return model.createMany(args);
}
