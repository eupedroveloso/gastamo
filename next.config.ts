import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Evita aviso: outro package-lock em ~/ faz o Next achar raiz errada (webpack / tracing).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  /** Evita empacotar Prisma no bundle do servidor com um cliente desatualizado (ex.: sem campos novos como `billingYm`). */
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "prisma"],
};

export default nextConfig;
