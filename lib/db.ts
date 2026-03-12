import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  let url = process.env.DATABASE_URL as string;
  if (url) {
    const sslmode = "sslmode=verify-full";
    if (url.includes("sslmode=")) {
      url = url.replace(/sslmode=[^&]+/, sslmode);
    } else {
      url += (url.includes("?") ? "&" : "?") + sslmode;
    }
  }
  const adapter = new PrismaPg({ connectionString: url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
