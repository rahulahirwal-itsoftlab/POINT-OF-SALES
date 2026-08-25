# Super Admin Platform Management Modules

This document outlines the architecture and APIs for the Platform Management modules available exclusively to the Super Admin.

## Modules

### 1. Subscription Management (`/api/super-admin/subscriptions`)
Manages the billing and lifecycle of restaurant subscriptions.

- `GET /` - List subscriptions with pagination and filtering
- `GET /:id` - Get specific subscription details
- `POST /` - Create a new subscription
- `POST /:id/renew` - Renew a subscription (extends currentPeriodEnd)
- `POST /:id/suspend` - Suspend a subscription   
- `POST /:id/cancel` - Cancel a subscription (cancels at period end or immediately)
- `POST /:id/reactivate` - Reactivate a suspended or canceled subscription

### 2. License Management (`/api/super-admin/licenses`)
Handles the access control and validity of restaurant licenses.

- `GET /` - List licenses
- `GET /:id` - Get license details
- `POST /:id/activate` - Manually activate a license
- `POST /:id/suspend` - Suspend a license
- `POST /:id/revoke` - Revoke a license completely
- `POST /trigger-expiry` - Bulk scan and expire licenses whose validUntil date has passed

### 3. Revenue (`/api/super-admin/revenue`)
Aggregates financial data for platform earnings.

- `GET /` - Revenue overview (MRR, ARR, Total, Transaction counts)
- `GET /monthly` - Monthly revenue trend for charts
- `GET /yearly` - Yearly revenue trend for charts

### 4. Audit Logs (`/api/super-admin/audit-logs`)
Tracks critical platform actions across modules.

- `GET /` - List audit logs with pagination, search, and filtering
- `GET /:id` - Get specific audit log details
- `GET /filters` - Get available filter options for dropdowns

### 5. Notifications (`/api/super-admin/notifications`)
System alerts and updates for the Super Admin.

- `GET /` - List notifications (all or unread only)
- `GET /:id` - Get notification details
- `PATCH /:id/read` - Mark a notification as read

### 6. Settings (`/api/super-admin/settings`)
Platform-wide configurations. Uses a singleton row in the database.

- `GET /` - Get platform settings
- `PATCH /` - Update platform settings

## Auth Interception (Security)

The backend implements strict authorization interception during login for **Admin** and **Employee** roles. 

In `auth.service.ts`:
1. The system checks if the user's restaurant has a license.
2. It verifies the license status is exactly `ACTIVE`.
3. It verifies the associated subscription status is exactly `ACTIVE` or `PAST_DUE`.

If any of these conditions fail (e.g. License is `EXPIRED` or Subscription is `CANCELED`), the login request is rejected with a `403 Forbidden` error, blocking access completely until the Super Admin resolves the account standing.
