# API Architecture

All APIs are mounted under `/api/v1`.

Current module routes:

- `/api/v1/auth`
- `/api/v1/super-admin/dashboard`
- `/api/v1/super-admin/restaurants`
- `/api/v1/super-admin/plans`
- `/api/v1/super-admin/subscriptions`
- `/api/v1/super-admin/licenses`
- `/api/v1/super-admin/payments`
- `/api/v1/super-admin/audit-logs`
- `/api/v1/super-admin/login-activity`
- `/api/v1/super-admin/notifications`
- `/api/v1/super-admin/profile`
- `/api/v1/super-admin/settings`

Legacy module routes currently remain available for the broader POS modules while the implementation proceeds:

- `/api/v1/restaurants`
- `/api/v1/users`
- `/api/v1/subscriptions`
- `/api/v1/licenses`
- `/api/v1/menu`
- `/api/v1/tables`
- `/api/v1/customers`
- `/api/v1/orders`
- `/api/v1/kitchen`
- `/api/v1/billing`
- `/api/v1/payments`
- `/api/v1/audit-logs`
- `/api/v1/notifications`
- `/api/v1/dashboard`

Each module should expose controller methods only. Controllers call services, services own business rules, and repositories own tenant-filtered persistence.
