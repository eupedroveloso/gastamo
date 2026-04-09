import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { requireDatabaseUrl } from "@/lib/database-url";

function createPrismaClient() {
  const url = requireDatabaseUrl();

  // Cria o pool explicitamente e passa a instância (não PoolConfig).
  // Quando PrismaPg recebe PoolConfig, cria um Pool novo a cada connect() —
  // o pool nunca é reutilizado e conexões se acumulam até o limite do servidor.
  // Com uma instância de Pool, PrismaPg usa this.externalPool e reutiliza corretamente.
  const pool = new pg.Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
  });

  pool.on("error", (err) => {
    console.error("[db] pg pool error:", err.message);
  });

  const adapter = new PrismaPg(pool);

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
