# Restaurant POS SaaS

Enterprise-ready multi-tenant restaurant POS platform scaffold.

This repository is intentionally organized as a modular monolith:

- `frontend/` — Next.js App Router, TypeScript, Tailwind, shadcn/ui-ready UI architecture.
- `backend/` — Hono.js, TypeScript, Drizzle ORM, PostgreSQL, feature-first backend modules.
- `docs/` — architecture, permissions, API, and workflow decisions.

## Development

```bash
npm install
npm run dev
```

Run apps independently:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Architecture rule

Business rules live in the backend:

```text
Route -> Controller -> Service -> Repository -> Drizzle ORM -> PostgreSQL
```

The frontend consumes APIs and does not independently calculate critical totals, permissions, subscription state, or tenant access.

## Super Admin seed

Configure backend environment values before seeding:

```bash
SUPER_ADMIN_EMAIL=admin.pos@gmail.com
SUPER_ADMIN_PASSWORD=change-this-before-seeding
SUPER_ADMIN_NAME=ITSOFTLAB Super Admin
```

Then run:

```bash
cd backend
npm run db:seed
```

The seed is idempotent and hashes the password before saving.

## Docs

Start with [docs/architecture.md](docs/architecture.md).

Super Admin details: [docs/super-admin-implementation.md](docs/super-admin-implementation.md).
