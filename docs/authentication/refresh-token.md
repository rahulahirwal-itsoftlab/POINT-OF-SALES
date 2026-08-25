# Refresh Token API

**Route:** `POST /api/v1/auth/refresh`
**Required Authentication:** None (Requires valid `pos_refresh_token` cookie)

Validates the long-lived Reference Token, executes Token Rotation, and issues a new Access Token along with a fresh Reference Token.

## Process
1. Reads `pos_refresh_token` from cookies.
2. Performs a hash lookup against the `auth_sessions` table.
3. Verifies the session is neither expired nor revoked.
4. Rotates the session:
   - Revokes the old session in `auth_sessions`.
   - Creates a new session with a new Reference Token hash.
5. Issues a new Access Token.
6. Updates cookies.

## Request Body
```json
{
  "referenceToken": "abc123def456ghi789..."
}
```

*Note: The referenceToken can optionally be omitted if it is provided via the `pos_refresh_token` HTTP-only cookie.*

## Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "referenceToken": "new123def456ghi789...",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "message": "Refresh successful"
}
```

## Cookie Behavior
Updates `pos_access_token` and `pos_refresh_token` cookies securely.

## Error Responses
- `401 Unauthorized`: `REFRESH_TOKEN_INVALID`, `SESSION_REVOKED`, `TOKEN_EXPIRED`
- `403 Forbidden`: `ACCOUNT_INACTIVE`
