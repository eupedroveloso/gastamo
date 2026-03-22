/**
 * URL do Postgres: nome padrão ou prefixo de projeto na Vercel (ex.: gastamo_DATABASE_URL).
 */
export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.gastamo_DATABASE_URL ||
    process.env.gastamo_POSTGRES_URL ||
    process.env.gastamo_PRISMA_DATABASE_URL
  );
}

export function requireDatabaseUrl(): string {
  const url = getDatabaseUrl();
  if (!url?.trim()) {
    throw new Error(
      "Defina DATABASE_URL (ou na Vercel: gastamo_DATABASE_URL / POSTGRES_URL / PRISMA_DATABASE_URL)."
    );
  }
  return url;
}
