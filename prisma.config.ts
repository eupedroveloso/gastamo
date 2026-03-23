import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";
import { getDatabaseUrl } from "./lib/database-url";

// Carregar .env **antes** de ler DATABASE_URL (senão migrações/cli usam o placeholder).
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

/** Fallback só quando não há URL (ex.: `prisma generate` em CI sem BD). Migrações precisam de DATABASE_URL real. */
const datasourceUrl =
  getDatabaseUrl()?.trim() ||
  "postgresql://127.0.0.1:5432/prisma_generate_placeholder?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
