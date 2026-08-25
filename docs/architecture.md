# Restaurant POS Architecture

## System shape

```text
Next.js Frontend
  -> Hono Backend API
    -> Services
      -> Repositories
        -> Drizzle ORM
          -> PostgreSQL
```

The first production version should remain a modular monolith. Redis, queues, and real-time transports can be added only when the workflow requires them.

## Bounded feature modules

- Platform: `super-admin`, `restaurants`, `subscriptions`, `licenses`, `plans`
- Identity: `auth`, `users`, `roles`, `permissions`
- Restaurant operations: `menu`, `tables`, `customers`, `orders`, `kitchen`, `billing`, `payments`
- Governance: `audit-logs`, `notifications`, `dashboard`, `reports`

## Tenant model

- `SUPER_ADMIN` can operate across tenants.
- Restaurant-scoped roles must carry `restaurantId`.
- Every restaurant-owned query must filter by `restaurantId` in the repository layer.
- Tenant context is resolved in middleware and passed down to controllers/services.

## Order lifecycle

```text
DRAFT -> PLACED -> CONFIRMED -> PREPARING -> READY -> SERVED -> COMPLETED
                              \-> CANCELLED
```

Only the backend may transition order states.

## Payment lifecycle

```text
PENDING -> SUCCESS
        -> FAILED
        -> REFUNDED
        -> PARTIALLY_PAID
```

Payment amount validation happens in the billing/payment services. Payments may not exceed remaining bill balance unless an explicit overpayment/refund feature is added.

## Subscription/license guard

Protected restaurant operations require:

- Active restaurant
- Valid subscription
- Active license
- User permission
- Matching tenant

## Permission matrix

| Feature | Super Admin | Restaurant Admin | Waiter | Kitchen | Reception |
| --- | --- | --- | --- | --- | --- |
| Restaurants | Full | Own view | No | No | No |
| Subscriptions | Full | Own view | No | No | No |
| Licenses | Full | Own view | No | No | No |
| Staff | Full | Full own restaurant | Limited self | No | Limited view |
| Menu | View | Full | View | View | View |
| Tables | View | Full | View/update assigned | View | Full |
| Customers | View | Full | Create/view | View | Full |
| Orders | View | Full | Create/update allowed states | Kitchen states | View |
| Kitchen | View | View | View | Full | View |
| Bills | View | Full | View | No | Full |
| Payments | View | Full | No | No | Full |
| Audit Logs | Full | Own restaurant | Limited own | Limited own | Limited own |
| Notifications | Full | Own | Own | Own | Own |

## Backend module file convention

Each feature module follows:

```text
module/
  module.routes.ts
  module.controller.ts
  module.service.ts
  module.repository.ts
  module.validation.ts
  module.types.ts
  index.ts
```

Database table definitions live in `backend/src/db/schema`.
