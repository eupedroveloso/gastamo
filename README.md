This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Base de dados — migrações sem perder dados

1. Garante que o **PostgreSQL está a correr** e que `DATABASE_URL` no `.env` (ou `.env.local`) aponta para a base certa.
2. *(Opcional, recomendado em produção)* Faz backup antes de migrar, por exemplo:
   ```bash
   pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
   ```
3. Aplica migrações **sem reset** (só `ALTER TABLE` / colunas novas, etc.):
   ```bash
   npm run db:migrate
   ```
   Equivale a `prisma generate` + `prisma migrate deploy` — **não** apaga tabelas nem utilizadores.

Se ainda não usas a tabela `_prisma_migrations` e a base foi criada só com `db push`, na primeira vez podes precisar de [baselining](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining) ou continuar com `npx prisma db push` (também acrescenta colunas opcionais sem apagar dados, desde que não uses `--force-reset`).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
