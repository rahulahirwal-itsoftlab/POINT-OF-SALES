# Login API

**Route:** `POST /api/v1/auth/login`
**Required Authentication:** None

Authenticates a `SUPER_ADMIN`, `ADMIN`, or `EMPLOYEE` based on credentials. It generates an Access Token and a long-lived Reference/Refresh Token.

## Request Body
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

## Minimal Response
The response does **not** expose the complete user profile, password hash, internal database fields, or secrets.

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
    "referenceToken": "abc123def456ghi789...",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "message": "Login successful"
}
```

## Cookie Behavior & Postman Support
The backend simultaneously sets the tokens in HTTP-Only secure cookies for browser environments and returns them in the JSON payload for API testing tools like Postman or non-browser clients.
1. `pos_access_token`: Short-lived JWT (15 minutes).
2. `pos_refresh_token`: Long-lived Reference Token (default 7 days).

## Error Responses
- `401 Unauthorized`: `INVALID_CREDENTIALS`
- `403 Forbidden`: `ACCOUNT_INACTIVE`, `ACCOUNT_BLOCKED`, `LICENSE_EXPIRED`, `LICENSE_SUSPENDED`, `LICENSE_BLOCKED`, `LICENSE_REVOKED`, `LICENSE_INACTIVE`
- `429 Too Many Requests`: Triggered if login rate limits are exceeded.
