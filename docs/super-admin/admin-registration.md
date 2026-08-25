# Super Admin: Restaurant Onboarding

Restaurant onboarding is handled by `POST /api/v1/super-admin/restaurants`.

The transaction creates:

- `organizations` row, which becomes the tenant boundary;
- `restaurants` row;
- active restaurant owner login in `admins`, exposed as role `RESTAURANT_ADMIN`;
- `subscriptions` row linked to the restaurant and selected plan;
- `licenses` row linked to the restaurant and subscription;
- audit log rows;
- persistent notification.

If any step fails, the transaction rolls back and no orphan restaurant, owner, subscription, or license remains.

The owner password is hashed before persistence and is never returned in API responses.

No invitation token, invitation email, or activation acceptance step is required. The Restaurant Admin can immediately log in with the `owner.email` and `owner.password` supplied by the Super Admin.

Restaurant creation accepts business profile input only. The backend generates the restaurant public ID, restaurant code, admin public ID, password hash, subscription ID, and license key inside the creation transaction.

## Request

```json
{
  "restaurant": {
    "name": "Central Kitchen",
    "email": "ops@example.com",
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
    "phone": "+919888888888",
    "password": "StrongPassword123"
  },
  "subscription": {
    "planId": "uuid",
    "billingCycle": "MONTHLY",
    "currency": "INR",
    "startDate": "2026-08-18",
    "durationMonths": 3
  },
  "license": {
    "status": "ACTIVE"
  }
}
```

The backend calculates subscription and license expiry from `subscription.startDate + subscription.durationMonths`.

## Validation And Errors

- Duplicate owner login email across Super Admin, Restaurant Admin, or Employee identities returns `409 CONFLICT`.
- Invalid plan IDs return `400 MISSING_PLAN`.
- Invalid required fields return the project-standard validation error response.

## Login

Restaurant Admin login uses the normal `POST /api/v1/auth/login` route. Successful login sets the access token and reference/refresh token cookies and returns the user as role `RESTAURANT_ADMIN` with the correct `organizationId` and `restaurantId`.
