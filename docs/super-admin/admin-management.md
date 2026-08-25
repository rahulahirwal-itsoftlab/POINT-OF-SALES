# Super Admin: Restaurant Owner Management

There is no separate Super Admin module for managing owner accounts outside Restaurants.

The restaurant owner is the `RESTAURANT_ADMIN` for exactly one restaurant. Super Admin manages that owner through the restaurant record and restaurant onboarding flow.

Current model:

- Super Admin creates a restaurant.
- The same transaction creates the restaurant owner account.
- The owner account belongs to `admins.restaurant_id`.
- Authentication returns role `RESTAURANT_ADMIN`.
- Owner login is denied unless the owner account, restaurant, subscription, and license are all active and the license has not expired.

Restaurant status changes are handled by:

- `PATCH /api/v1/super-admin/restaurants/:id/activate`
- `PATCH /api/v1/super-admin/restaurants/:id/deactivate`
- `PATCH /api/v1/super-admin/restaurants/:id/block`
- `PATCH /api/v1/super-admin/restaurants/:id/unblock`
