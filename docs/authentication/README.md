# Authentication Architecture

## Summary

Authentication uses a short-lived access token plus a database-backed reference/refresh token.

- `pos_access_token` is an HTTP-only access JWT used by protected APIs.
- `pos_refresh_token` is an HTTP-only reference token; only its SHA-256 hash is stored in `auth_sessions`.
- `/api/v1/auth/refresh` rotates the reference token and issues a new access token.
- Protected backend routes can restore identity from a valid reference token when the access token has expired.
- When a protected request is restored from the reference token, the backend reissues the short-lived access cookie so subsequent requests do not repeatedly fall back to refresh-token restoration.
- Restaurant-owned identities carry `organizationId` and `restaurantId` in server-side auth context.
- Frontend auth state is loaded with `GET /api/v1/auth/me`.
- Restaurant Admin owner accounts are created directly by Super Admin during restaurant onboarding and can log in immediately. Invitation/activation routes are not part of the active login flow.

## Login Flow

```text
Login form
  -> POST /api/v1/auth/login
  -> validate email/password
  -> find Super Admin, Restaurant Admin owner, or Employee by email
  -> verify password hash
  -> verify account status is ACTIVE
  -> for Restaurant Admin/Employee, verify restaurant, subscription, and license access
  -> issue access token
  -> create reference token and store its hash in auth_sessions
  -> set HTTP-only cookies
  -> redirect Super Admin to /super-admin/dashboard
```

## Cookies

- `pos_access_token`: `HttpOnly`, `SameSite=Lax`, `Path=/`, 15 minute max age.
- `pos_refresh_token`: `HttpOnly`, `SameSite=Lax`, `Path=/`, expiry based on `AUTH_SESSION_DAYS`.
- Both cookies are `Secure` in production.

## Access Enforcement

Restaurant Admin and Employee authentication is denied when any required business condition is invalid:

- account status is not `ACTIVE`;
- organization status is not `ACTIVE`;
- restaurant status is not `ACTIVE`;
- license is missing, expired, suspended, blocked, revoked, or otherwise inactive;
- subscription is pending, expired, suspended, cancelled, or past `endDate`.

Super Admin platform APIs additionally require `requireRole("SUPER_ADMIN")`.

## Logout Flow

```text
POST /api/v1/auth/logout
  -> read pos_refresh_token
  -> hash token
  -> revoke matching auth_sessions row
  -> record logout activity/audit where applicable
  -> clear pos_access_token and pos_refresh_token
```

## Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_NAME`
- `AUTH_SESSION_DAYS`
- `CORS_ORIGIN`
