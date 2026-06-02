import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot-reloads in dev to avoid exhausting
// the Postgres connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Resolve the connection string from whichever env var the host provides.
// Vercel's Postgres/Prisma storage integration sets POSTGRES_URL /
// PRISMA_DATABASE_URL rather than DATABASE_URL, so fall back across all three.
// `datasourceUrl` overrides the schema's env("DATABASE_URL"), making the
// runtime resilient to the env-var name the platform happens to use.
const datasourceUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.PRISMA_DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
