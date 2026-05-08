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

  try {
    return await model.count(args);
  } catch (error) {
    console.error("Recruitment count unavailable", error);
    return 0;
  }
}

export async function safeFindMany(model, args) {
  if (!model?.findMany) {
    return [];
  }

  try {
    return await model.findMany(args);
  } catch (error) {
    console.error("Recruitment list unavailable", error);
    return [];
  }
}

export async function safeCreateMany(model, args) {
  if (!model?.createMany) {
    return { count: 0 };
  }

  try {
    return await model.createMany(args);
  } catch (error) {
    console.error("Recruitment seed unavailable", error);
    return { count: 0 };
  }
}
