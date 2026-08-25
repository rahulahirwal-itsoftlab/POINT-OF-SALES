# POS SaaS API Documentation - Authentication Module

## Overview

Authentication covers `SUPER_ADMIN`, `RESTAURANT_ADMIN`, and restaurant employee roles. Internally, restaurant owner sessions use the `ADMIN` subject because they are stored in `auth_sessions.admin_id`, but API identity exposes role `RESTAURANT_ADMIN`.

- `pos_access_token`: HTTP-only access JWT.
- `pos_refresh_token`: HTTP-only reference token.
- `auth_sessions`: PostgreSQL table storing only the reference token hash.

## POST `/api/v1/auth/login`

- **Purpose**: Authenticate credentials and start a secure session.
- **Auth Required**: No.
- **Rate Limit**: Yes.
- **Request Body**:
  ```json
  {
    "email": "admin.pos@gmail.com",
    "password": "Admin@1234"
  }
  ```
- **Response Headers**:
  - `Set-Cookie: pos_access_token=...; HttpOnly; SameSite=Lax; Path=/`
  - `Set-Cookie: pos_refresh_token=...; HttpOnly; SameSite=Lax; Path=/`
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "...",
      "referenceToken": "...",
      "tokenType": "Bearer",
      "expiresIn": 900
    }
  }
  ```
- **Database Entities**: `super_admins`, `admins`, `employees`, `restaurants`, `subscriptions`, `licenses`, `auth_sessions`, `login_activity`, `audit_logs`.
- **Errors**: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_*`, `403 RESTAURANT_INACTIVE`, `403 LICENSE_*`, `403 SUBSCRIPTION_INACTIVE`, `422 VALIDATION_ERROR`, `429 RATE_LIMIT_EXCEEDED`.

## POST `/api/v1/auth/refresh`

- **Purpose**: Rotate the reference token and issue a new access token.
- **Auth Required**: Valid `pos_refresh_token` cookie or `referenceToken` body field.
- **Success Response**: Same token response shape as login.
- **Database Entities**: `auth_sessions`, actor table for the current subject, and `audit_logs` where applicable.
- **Errors**: `401 REFRESH_TOKEN_INVALID`, `403 ACCOUNT_*`, `403 RESTAURANT_INACTIVE`, `403 LICENSE_*`, `403 SUBSCRIPTION_INACTIVE`.

## GET `/api/v1/auth/me`

- **Purpose**: Load the authenticated safe user profile.
- **Auth Required**: Valid `pos_access_token`; middleware can restore identity from a valid `pos_refresh_token`.
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Authenticated user loaded",
    "data": {
      "user": {
        "id": "SA_...",
        "name": "ITSOFTLAB Super Admin",
        "email": "admin.pos@gmail.com",
        "phone": null,
        "role": "SUPER_ADMIN",
        "subjectType": "SUPER_ADMIN",
        "status": "ACTIVE",
        "isActive": true,
        "permissions": [],
        "restaurantIds": [],
        "lastLoginAt": "2026-08-18T00:00:00.000Z"
      }
    }
  }
  ```
- **Database Entities**: `super_admins`, `admins`, `employees`, `restaurants`, `subscriptions`, `licenses`, `auth_sessions`.

## POST `/api/v1/auth/logout`

- **Purpose**: Revoke the current reference session and clear auth cookies.
- **Auth Required**: No; gracefully handles missing/expired sessions.
- **Response Headers**:
  - Clears `pos_access_token`
  - Clears `pos_refresh_token`
- **Success Response**:
  ```json
  {
    "success": true,
    "message": "Logout successful",
    "data": {
      "loggedOut": true
    }
  }
  ```
- **Database Entities**: `auth_sessions`, `login_activity`, `audit_logs`.
