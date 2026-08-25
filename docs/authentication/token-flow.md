# Authentication Token Architecture & Flow

The POS architecture uses a robust dual-token mechanism: an Access Token and a Reference/Refresh Token.

## Roles
The same secure token architecture handles all multitenant identities seamlessly:
- `SUPER_ADMIN`
- `ADMIN`
- `WAITER`
- `RECEPTION`
- `KITCHEN`

## Tokens

### 1. Access Token (JWT)
- **Lifespan**: 15 minutes.
- **Form**: Cryptographically signed JSON Web Token (HMAC SHA-256).
- **Transport**: `pos_access_token` HTTP-Only Secure cookie **OR** the `Authorization: Bearer <token>` header.
- **Claims**:
  - `sub`: The UUID of the authenticated principal.
  - `type`: `SUPER_ADMIN`, `ADMIN`, or `EMPLOYEE`.
  - `role`: Detailed user role.
  - `restaurantId`: Included for tenant scoped validation.

### 2. Reference Token
- **Lifespan**: 7 Days (configurable).
- **Form**: 48-byte cryptographically secure random string.
- **Transport**: `pos_refresh_token` HTTP-Only Secure cookie **OR** the `referenceToken` JSON field.
- **Storage**: Only the **SHA-256 Hash** is stored in the PostgreSQL `auth_sessions` table.

## Standard Flow

1. **Login Request**: Client POSTs credentials to `/api/v1/auth/login`.
2. **Tokens Issued**: Server generates both tokens and places them in Set-Cookie headers.
3. **Protected APIs**: Client calls protected APIs. The browser automatically attaches `pos_access_token` and `pos_refresh_token`.
4. **Validation (Fast)**: `requireAuth` middleware verifies the `pos_access_token` signature without calling PostgreSQL.
5. **Expiration**: After 15 minutes, the Access Token expires. The `requireAuth` middleware throws `401 Unauthorized`.
6. **Token Refresh**: Client POSTs to `/api/v1/auth/refresh`. The server receives the `pos_refresh_token`, hashes it, and queries `auth_sessions`. If valid, it revokes the old session, issues a new Reference Token, and a new Access Token.
7. **Logout**: Client POSTs to `/api/v1/auth/logout`. The Reference Token is marked `revokedAt = NOW()` and cookies are cleared.

## Security Posture
- Total mitigation against XSS stealing tokens (Local Storage is not used).
- Granular session invalidation (tokens are not entirely stateless since the refresh layer intercepts revoked identities every 15 minutes).
- The `users` monolith is defunct; polymorphic multi-tenant identification is achieved securely.
