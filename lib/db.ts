import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { requireDatabaseUrl } from "@/lib/database-url";

/** Evita aviso do pg-connection-string: require/prefer/verify-ca viram verify-full de forma explícita. */
function normalizePgSslMode(url: string): string {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode")?.toLowerCase();
    if (mode === "prefer" || mode === "require" || mode === "verify-ca") {
      u.searchParams.set("sslmode", "verify-full");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function createPrismaClient() {
  const raw = requireDatabaseUrl();
  const url = normalizePgSslMode(raw);

  // Em serverless (Vercel) cada invocação é isolada — pool de 1 conexão evita
  // esgotamento do limite de conexões do banco quando há invocações paralelas.
  const isServerless = process.env.NODE_ENV === "production";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg({
    connectionString: url,
    max: isServerless ? 1 : 10,
    idleTimeoutMillis: isServerless ? 1_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  } as any);

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
