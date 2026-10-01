import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma = global.prismaGlobal || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export async function resetDatabase(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.remediation.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.approvalDecision.deleteMany();
  await prisma.incident.deleteMany();
}

export default prisma;
