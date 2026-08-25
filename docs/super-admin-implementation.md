# Super Admin Implementation Audit

Current implementation is based on Hono, TypeScript, Drizzle ORM, PostgreSQL, and Next.js.

## Database Source Of Truth

Super Admin production features use PostgreSQL-backed tables from `backend/src/db/schema/core.ts`.

| Table | Purpose | Primary Key | Key Foreign Keys | Used By | Status |
| --- | --- | --- | --- | --- | --- |
| `super_admins` | Platform Super Admin accounts | `id` UUID | none | auth, audit, sessions, settings | REQUIRED |
| `restaurants` | Tenant restaurant records | `id` UUID | none | Super Admin restaurant/admin/subscription/license/payment flows | REQUIRED |
| `admins` | Restaurant owner accounts exposed as `RESTAURANT_ADMIN` | `id` UUID | `restaurant_id` | owner auth, restaurant onboarding | REQUIRED |
| `subscription_plans` | Database-backed subscription pricing/configuration | `id` UUID | none | admin registration, subscription creation | REQUIRED |
| `subscriptions` | Restaurant SaaS subscription lifecycle | `id` UUID | `restaurant_id`, `plan_id` | subscriptions, dashboard, revenue, licenses | REQUIRED |
| `licenses` | Restaurant access licenses | `id` UUID | `restaurant_id`, `subscription_id` | auth access checks, license management | REQUIRED |
| `payments` | Restaurant bill payments and platform subscription payments | `id` UUID | `restaurant_id`, `subscription_id`, `bill_id`, actor IDs | revenue, payment lists | REQUIRED |
| `audit_logs` | Immutable business/security event log | `id` UUID | actor IDs, `restaurant_id`, optional `admin_id`, `subscription_id`, `license_id` | audit log pages, auth, Super Admin write flows | REQUIRED |
| `notifications` | Persisted event notifications | `id` UUID | recipient IDs, `restaurant_id` | notification pages, Super Admin events | REQUIRED |
| `auth_sessions` | Hashed refresh/reference token sessions | `id` UUID | subject IDs | auth refresh/logout | REQUIRED |
| `login_activity` | Login/logout/failure audit trail | `id` UUID | subject IDs, `restaurant_id` | auth, Super Admin login activity | REQUIRED |
| `admin_invitations` | Legacy invitation records retained for database compatibility | `id` UUID | `admin_id`, `restaurant_id`, creator IDs | not used by current Restaurant Admin onboarding | LEGACY |
| `platform_settings` | Platform defaults and settings | `id` UUID | `updated_by_super_admin_id` | settings page and default business configuration | REQUIRED |

Restaurant-operation tables (`employees`, `menu_categories`, `menu_items`, `restaurant_tables`, `customers`, `orders`, `order_items`, `bills`) are required by the restaurant POS modules and are not Super Admin duplicates.

No table was classified as safe to remove in this pass. No duplicate Super Admin table was found.

## Changes In This Pass

- Added migration `0002_super_admin_audit_notification_links.sql`.
- Added optional audit links: `audit_logs.entity_id`, `admin_id`, `subscription_id`, `license_id` plus indexes and foreign keys.
- Added notification event fields: `notifications.type`, `entity_type`, `entity_id`, `dedupe_key` plus indexes and a dedupe unique index.
- Fixed subscription create/renew/status controllers to validate JSON and pass the authenticated Super Admin actor into repository transactions.
- Added persisted notifications and richer linked audit rows for subscription lifecycle, license status/renewal/expiry, and platform settings updates.
- Updated restaurant onboarding so Super Admin creates restaurant, owner, subscription, and license in one restaurant transaction.
- Fixed frontend currency formatting and aligned subscription list/detail pages to the backend response shape and statuses.
- Removed build-blocking `any`/unused-error lint violations in Super Admin frontend files.

## Verification

- Backend typecheck: passed.
- Backend build: passed.
- Frontend typecheck: passed after Next generated route types.
- Frontend ESLint: passed.
- Frontend production build: passed.
- Super Admin source scan found no production hardcoded business records.

Database migration application is pending explicit approval for the configured PostgreSQL database. The first migration attempt was blocked by sandbox networking, and escalation was rejected because the configured database appears remote. Apply `npm.cmd run db:migrate --workspace @restaurant-pos/backend` only after confirming the target database and backup/rollback plan.

## Super Admin Frontend

Protected Super Admin routes live under `frontend/src/app/(dashboard)/super-admin`. The route group is protected by `requireSuperAdmin`, which calls the backend `/api/v1/auth/me` endpoint using the HTTP-only auth cookies. The client-side API layer uses `frontend/src/lib/api/client.ts`, which sets `withCredentials`, normalizes backend errors, handles `401` redirects, and preserves request IDs.

Implemented frontend sections:

| Section | Route | Backend dependency |
| --- | --- | --- |
| Login | `/login` | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| Dashboard | `/super-admin/dashboard` and `/super-admin` | `GET /api/v1/super-admin/dashboard`, revenue chart endpoints |
| Restaurants | `/super-admin/restaurants`, `/super-admin/restaurants/create`, `/super-admin/restaurants/:id` | restaurant CRUD, lifecycle, owner, subscription, and license onboarding APIs |
| Subscriptions | `/super-admin/subscriptions`, `/super-admin/subscriptions/:id` | list/detail/create/renew/suspend/cancel/reactivate subscription APIs |
| Licenses | `/super-admin/licenses` | list, activate, suspend, revoke license APIs |
| License Expiry | `/super-admin/licenses/expiry` | `POST /licenses/trigger-expiry` |
| Revenue | `/super-admin/revenue` | overview/monthly/yearly revenue APIs |
| Payments | `/super-admin/payments` | `GET /payments` for SaaS subscription payments |
| Audit Logs | `/super-admin/audit-logs` | audit list/detail/filter APIs |
| Notifications | `/super-admin/notifications` | notification list/detail/mark-read APIs |
| Settings | `/super-admin/settings` | `GET/PATCH /settings` |
| Profile/session/logout | `/super-admin/profile`, shell logout | `GET /profile`, `POST /auth/logout` |

The Super Admin shell is implemented in `frontend/src/components/layout/super-admin-shell.tsx`. It contains a scoped sidebar, active-route highlighting, backend-derived unread notification count, profile link, and logout action. It intentionally does not include waiter, kitchen, reception, or restaurant POS navigation.

Frontend integration notes:

- Production Super Admin pages use backend APIs backed by PostgreSQL records.
- Notification rows consume the backend joined row shape (`notification`, `restaurant`, recipients).
- Audit logs use the backend joined row shape (`audit`, `actor`, `restaurant`) and backend-provided filter values.
- License actions use the actual backend endpoints (`/activate`, `/suspend`, `/revoke`, `/renew`, `/trigger-expiry`); obsolete duplicate frontend license API code was removed.
- Restaurant creation posts restaurant, owner, subscription, and license sections accepted by the strict backend validator.
- Profile is read-only because the backend exposes `GET /super-admin/profile` but no profile update endpoint.
- Mark-all notifications and subscription payment creation are not implemented because matching backend endpoints/forms are not available in the current contract.
