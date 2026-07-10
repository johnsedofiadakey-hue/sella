# Sella

A shared multi-tenant ecommerce platform that gives local businesses in Ghana & West Africa a
professional online store, built for how their category actually sells — cart checkout, booking,
or enquiry, depending on the vertical. Operated by [StormGlide](https://stormglide.io).

See the `Sella_*.docx` planning documents in this repo for the full concept, architecture, launch,
and design plan.

## Getting Started

Copy `.env.example` to `.env.local` and start the local Postgres instance:

```bash
docker compose up db -d
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. On localhost, storefronts
resolve via `?store=<slug>` (e.g. `?store=amas-fashion`) rather than real subdomains — see
`proxy.ts`.

## Project layout

- `app/` — the Next.js App Router monolith: marketing site (`/`), storefronts (`/store/[slug]`),
  merchant portal (`/my/[slug]`), and staff tooling (`/mission-control`)
- `db/schema.ts` — the multi-tenant Postgres schema (Drizzle ORM), `tenant_id` on every row
- `lib/` — domain logic (billing, KYC, disputes, payments, analytics, etc.), kept out of route
  files so it's shared between pages, server actions, and webhooks
- `scripts/backup.ts` — nightly `pg_dump` → R2 backup job

## Scripts

- `npm run dev` / `build` / `start` — standard Next.js commands
- `npm run db:push` — apply the Drizzle schema to Postgres
- `npm run db:seed` — seed a sample tenant
- `npm run db:backup` — run a database backup (see `scripts/backup.ts`)
- `npm run db:studio` — Drizzle Studio, a GUI over the local database
