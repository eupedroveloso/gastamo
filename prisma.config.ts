import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";
import { getDatabaseUrl } from "./lib/database-url";

/** Só para `prisma generate` / parse do config sem .env (ex.: postinstall). Migrações precisam de URL real. */
const datasourceUrl =
  getDatabaseUrl()?.trim() ||
  "postgresql://127.0.0.1:5432/prisma_generate_placeholder?schema=public";

// Por padrão só `.env` é lido; Next.js usa `.env.local`, então carregamos os dois (local ganha).
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
