# Me (Current User) API

**Route:** `GET /api/v1/auth/me`
**Required Authentication:** Requires a valid `pos_access_token` JWT cookie.

Returns safe information about the currently authenticated principal (Super Admin, Admin, or Employee).

## Process
1. `requireAuth` middleware intercepts the request.
2. Reads the `pos_access_token` cookie.
3. Verifies the JWT signature against the server's `JWT_SECRET`.
4. Decodes the claims (`sub`, `type`, `role`, `restaurantId`) and mounts them to the request Context.
5. The `/me` controller fetches the full, safe user object dynamically from the corresponding tenant tables (without password hashes).

## Request Body
None required.

## Response
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "pub_abc123",
      "name": "John Doe",
      "email": "john@restaurant.com",
      "role": "ADMIN",
      "subjectType": "ADMIN",
      "status": "ACTIVE",
      "isActive": true,
      "permissions": [],
      "restaurantIds": ["...uuid..."],
      "lastLoginAt": "2026-08-17T12:00:00.000Z"
    }
  },
  "message": "Authenticated user loaded"
}
```

## Security
This endpoint is entirely free of exposing:
- Password Hash
- Database UUIDs for users
- Session internals
- Reference Tokens

## Error Responses
- `401 Unauthorized`: Rejects expired or tampered Access Tokens.
