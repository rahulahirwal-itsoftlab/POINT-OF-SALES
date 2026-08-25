# POS SaaS Authentication Flow

## Architecture

```text
[Browser] -- credentials --> [Hono Auth API]
    |                         |
    |<-- Set-Cookie ----------|
    |    pos_access_token     |
    |    pos_refresh_token    |
    |                         v
    |                  [PostgreSQL auth_sessions]
    |                  stores refresh token hash only
```

## Login Sequence

1. User opens `/login`.
2. Frontend validates credentials and sends `POST /api/v1/auth/login`.
3. Backend rate limit and Zod validation run.
4. Auth service looks up `super_admins`, then `admins`, then `employees`.
5. Password is verified against `password_hash`.
6. Account status must be `ACTIVE`.
7. Restaurant Admin/Employee access also requires an active restaurant, active subscription, active license, and non-expired license.
8. Backend issues a 15 minute access JWT and a long-lived reference token.
9. Backend stores only the reference token hash in `auth_sessions`.
10. Backend sets `pos_access_token` and `pos_refresh_token` HTTP-only cookies.
11. Login UI refetches `/auth/me` and redirects Super Admin users to `/super-admin/dashboard`.

## Session Restoration

Protected APIs first validate `pos_access_token`. If it is missing or expired, middleware checks `pos_refresh_token` against `auth_sessions` and restores request identity when the session is still valid. Client API calls that receive `401` call `/api/v1/auth/refresh` once, then retry the original request.

## Refresh Sequence

1. Client calls `POST /api/v1/auth/refresh`.
2. Backend reads `pos_refresh_token`, hashes it, and finds a valid non-revoked `auth_sessions` row.
3. Backend verifies the account and business access rules again.
4. Backend revokes the old session row.
5. Backend issues a new access token and a new reference token.
6. Backend sets fresh `pos_access_token` and `pos_refresh_token` cookies.

## Logout Sequence

1. Client calls `POST /api/v1/auth/logout`.
2. Backend reads and hashes `pos_refresh_token`.
3. Backend revokes the matching session when it exists.
4. Backend records logout activity/audit where applicable.
5. Backend clears both auth cookies.
