# Restaurant Management API

Super Admin manages restaurants through an Organization tenant boundary. The restaurant owner is created as the `RESTAURANT_ADMIN` login account during restaurant onboarding.

## Security

- Authentication uses HTTP-only `pos_access_token` and `pos_refresh_token` cookies.
- Required role: `SUPER_ADMIN`.
- Responses never include password hashes, tokens, JWT secrets, or database credentials.

## POST `/api/v1/super-admin/restaurants`

- **Purpose**: Atomically create an organization, restaurant, restaurant owner login, subscription, license, audit rows, and notification.
- **Authentication**: Required.
- **Required Role**: `SUPER_ADMIN`.
- **Headers**: `Content-Type: application/json`.
- **Request Body**:
  ```json
  {
    "restaurant": {
      "name": "Central Cafe",
      "email": "business@example.com",
      "phone": "+919999999999",
      "address": "MG Road",
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "India",
      "postalCode": "560001",
      "taxNumber": "GSTIN123",
      "status": "ACTIVE"
    },
    "owner": {
      "name": "Restaurant Owner",
      "email": "owner@example.com",
      "phone": "+919999999998",
      "password": "StrongPass123"
    },
    "subscription": {
      "planId": "00000000-0000-0000-0000-000000000000",
      "billingCycle": "MONTHLY",
      "currency": "INR",
      "startDate": "2026-08-18",
      "endDate": "2026-09-18",
      "renewalDate": "2026-09-18"
    },
    "license": {
      "startDate": "2026-08-18",
      "expiryDate": "2026-09-18",
      "renewalDate": "2026-09-18",
      "status": "ACTIVE"
    }
  }
  ```
- **Validation**: Valid email addresses, password length >= 8, valid plan UUID, valid billing cycle, valid status enums.
- **Success Response**: `201 Created` with safe `restaurant`, `owner`, `subscription`, and `license` records.
- **Errors**: `401`, `403`, `409 RESTAURANT_OWNER_EMAIL_ALREADY_EXISTS`, `422`, `500`.
- **Foreign Keys**: `restaurants.organization_id -> organizations.id`, `admins.organization_id -> organizations.id`, `admins.restaurant_id -> restaurants.id`, `subscriptions.organization_id -> organizations.id`, `subscriptions.restaurant_id -> restaurants.id`, `licenses.organization_id -> organizations.id`, `licenses.restaurant_id -> restaurants.id`, `licenses.subscription_id -> subscriptions.id`.

## GET `/api/v1/super-admin/restaurants`

- **Purpose**: List restaurants with owner, subscription, and license summaries.
- **Query Parameters**: `page`, `limit`, `search`, `status`, `city`.
- **Success Response**: Paginated rows containing `restaurantId`, `restaurantName`, owner name/email, restaurant status, subscription status, license status, license expiry, and created date.

## GET `/api/v1/super-admin/restaurants/:id`

- **Purpose**: Load restaurant detail.
- **Parameters**: `id` can be the restaurant UUID currently used by the API.
- **Success Response**: Restaurant information, owner information, current subscription, current license, related rows, and recent audit activity.

## PATCH `/api/v1/super-admin/restaurants/:id`

- **Purpose**: Update safe restaurant fields.
- **Request Body**: Partial restaurant fields such as `restaurantName`, `ownerName`, `email`, `phone`, address fields, and tax number.
- **Restrictions**: Cannot update ids, `createdAt`, password hashes, or secrets.

## DELETE `/api/v1/super-admin/restaurants/:id`

- **Purpose**: Soft-delete/archive a restaurant.
- **Behavior**: Sets restaurant status to `ARCHIVED`; business records are preserved for audit, payments, subscriptions, and licenses.

## Lifecycle Endpoints

- `PATCH /api/v1/super-admin/restaurants/:id/activate`
- `PATCH /api/v1/super-admin/restaurants/:id/deactivate`
- `PATCH /api/v1/super-admin/restaurants/:id/block`
- `PATCH /api/v1/super-admin/restaurants/:id/unblock`

All lifecycle endpoints write audit logs. Blocking also creates a persistent notification.
