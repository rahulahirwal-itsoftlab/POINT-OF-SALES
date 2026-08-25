# Admin: Employee Management APIs

These APIs allow an `ADMIN` to manage employees within their strictly isolated `restaurantId`.

## Security Context & Tenant Isolation
- **Role Requirement**: `ADMIN`
- **Authentication**: `Bearer <token>` OR `pos_access_token` cookie

**CRITICAL ISOLATION RULE**: The backend does NOT trust `restaurantId` provided by the frontend. The `AuthMiddleware` verifies the JWT, extracting the `restaurantId` implicitly bound to the Admin at login time. This prevents cross-tenant access universally.

---

### Employee Roles

Employees are segregated strictly by operation:
- `WAITER`
- `RECEPTION`
- `KITCHEN`

Super Admins CANNOT create these roles. Only Admins can.

### API Surface (Pending Full API Controller Alignment)

- `GET /api/v1/admin/employees` - List employees bounded to Admin's restaurant.
- `POST /api/v1/admin/employees` - Create a new Employee.
- `PATCH /api/v1/admin/employees/:id/status` - Block or activate an Employee.
