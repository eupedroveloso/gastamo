import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Evita aviso: outro package-lock em ~/ faz o Next achar raiz errada (webpack / tracing).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
