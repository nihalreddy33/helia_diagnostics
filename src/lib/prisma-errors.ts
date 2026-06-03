import { Prisma } from "@prisma/client";

/**
 * Translate a Prisma error into a human-friendly message. Keeps database
 * constraint failures from leaking raw internals to the UI.
 */
export function describePrismaError(err: unknown, fallback: string): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const target = (err.meta?.target as string[] | undefined)?.join(", ");
        return target
          ? `That ${target} is already in use.`
          : "A record with these unique values already exists.";
      }
      case "P2003":
        return "This record is linked to others and can't be changed as-is.";
      case "P2025":
        return "The record was not found (it may have been deleted).";
      default:
        return fallback;
    }
  }
  return fallback;
}
