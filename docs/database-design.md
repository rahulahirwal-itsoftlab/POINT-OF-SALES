# Database Design

Initial entities:

- `roles`
- `permissions`
- `role_permissions`
- `restaurants`
- `users`
- `restaurant_users`
- `plans`
- `subscriptions`
- `licenses`
- `menu_categories`
- `menu_items`
- `restaurant_tables`
- `customers`
- `orders`
- `order_items`
- `bills`
- `payments`
- `audit_logs`
- `login_activity`
- `notifications`

Core design decisions:

- Internal IDs are UUID primary keys.
- Public-facing identifiers use separate fields such as `publicId`, `customerCode`, `orderNumber`, and `billNumber`.
- Restaurant-owned records include `restaurantId` for tenant isolation.
- Users receive permissions through `users.role_id -> roles.id -> role_permissions -> permissions`.
- Restaurant-scoped users are attached through `restaurant_users`, not through frontend claims.
- Historical order lines snapshot item name and price.
- Critical totals are stored after backend-side calculation.
