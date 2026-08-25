# Logout API

**Route:** `POST /api/v1/auth/logout`
**Required Authentication:** None strictly enforced, but expects `pos_refresh_token` in cookies.

Revokes the active authentication session securely.

## Process
1. Reads `pos_refresh_token` from cookies.
2. Performs a hash lookup against the `auth_sessions` table.
3. Sets `revokedAt` to `NOW()` for the found session.
4. Logs an `AUTH_LOGOUT` audit trail.
5. Clears `pos_access_token` and `pos_refresh_token` cookies.

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
    "loggedOut": true
  },
  "message": "Logout successful"
}
```

## Cookie Behavior
Instructs the client to delete both authentication cookies.

## Error Responses
Always returns a successful `200 OK` response to ensure clients can log out regardless of session state.
