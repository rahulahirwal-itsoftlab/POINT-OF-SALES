# API Routes Overview

This document maps the supported authentication and Super Admin routes.

## Core Authentication

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me`

## Super Admin Restaurants

- `POST   /api/v1/super-admin/restaurants`
- `GET    /api/v1/super-admin/restaurants`
- `GET    /api/v1/super-admin/restaurants/:id`
- `PATCH  /api/v1/super-admin/restaurants/:id`
- `DELETE /api/v1/super-admin/restaurants/:id`
- `PATCH  /api/v1/super-admin/restaurants/:id/activate`
- `PATCH  /api/v1/super-admin/restaurants/:id/deactivate`
- `PATCH  /api/v1/super-admin/restaurants/:id/block`
- `PATCH  /api/v1/super-admin/restaurants/:id/unblock`

`GET /api/v1/super-admin/restaurants` supports `search`, `status`, `subscriptionStatus`, `licenseStatus`, `page`, and `limit`.

`POST /api/v1/super-admin/restaurants` directly creates the Organization, Restaurant, active Restaurant Admin credentials, Subscription, License, Audit Log, and Notification in one transaction. There is no Restaurant Admin invitation or activation endpoint in the active auth route map.

## Super Admin Platform Modules

- `GET /api/v1/super-admin/dashboard`
- `GET /api/v1/super-admin/subscriptions`
- `POST /api/v1/super-admin/subscriptions`
- `GET /api/v1/super-admin/subscriptions/:id`
- `POST /api/v1/super-admin/subscriptions/:id/renew`
- `POST /api/v1/super-admin/subscriptions/:id/suspend`
- `POST /api/v1/super-admin/subscriptions/:id/cancel`
- `POST /api/v1/super-admin/subscriptions/:id/reactivate`
- `POST /api/v1/super-admin/subscriptions/trigger-expiry`
- `POST /api/v1/super-admin/subscriptions/notify-expiring`
- `GET /api/v1/super-admin/licenses`
- `GET /api/v1/super-admin/revenue`
- `GET /api/v1/super-admin/audit-logs`
- `GET /api/v1/super-admin/notifications`
- `PATCH /api/v1/super-admin/notifications/:id/read`
- `PATCH /api/v1/super-admin/notifications/read-all`
- `GET /api/v1/super-admin/settings`

Restaurant owner accounts are created as part of restaurant onboarding. They are not managed through a separate Super Admin Admin Management API.

## Subscription Contract

Subscription creation is organization-based and calculates expiry in the backend. `POST /api/v1/super-admin/subscriptions` accepts `organizationId`, optional `restaurantId`, `planId`, `billingCycle`, `price`, `currency`, `startDate`, `durationMonths`, optional `renewalDate`, and optional `status`.

Subscription list filtering is performed by query parameters: `search`, `organizationId`, `restaurantId`, `planId`, `billingCycle`, `status`, `paymentStatus`, `expiresInDays`, `startFrom`, `startTo`, `expiryFrom`, `expiryTo`, `page`, and `limit`.

## Organization Access

Organization is the tenant boundary. Restaurant-owned APIs derive `organizationId` from the authenticated session, not from request bodies. Non-Super Admin requests pass through organization, restaurant, subscription, and license validation before controllers run.

## Database Migrations

- `0003_organization_tenant_boundary.sql` creates/backfills organizations and tenant foreign keys.
- `0004_order_items_tenant_boundary.sql` adds `organization_id` and `restaurant_id` to `order_items`.
- `0005_subscription_currency.sql` persists subscription currency.
- `0006_remove_restaurant_admin_invite_default.sql` changes the `admins.status` database default to `ACTIVE` for direct Restaurant Admin creation.
- `0007_restaurant_business_profile.sql` extends the existing `restaurants` table with backend-generated `code` plus business profile fields used by the Super Admin creation form.

Run `npm run db:verify-schema --workspace backend` to verify the live PostgreSQL/Neon schema has the required organization tables, tenant columns, and foreign keys.
