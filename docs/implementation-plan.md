# Implementation Plan

1. Backend foundation: auth, tenant context, RBAC, error handling, pagination, audit helper. Started.
2. Database migrations and development seed. Schema and idempotent Super Admin seed added; migration generation pending package install.
3. Core SaaS modules: restaurants, plans, subscriptions, licenses. Super Admin restaurants/plans added; subscription/license read routes added.
4. Restaurant management: users, roles/permissions, menu, tables, customers.
5. POS workflow: orders, kitchen status transitions, billing, payments, receipts.
6. Dashboard APIs from real database queries.
7. Frontend foundation: protected layouts, role navigation, API client, query provider, forms.
8. Role interfaces: Super Admin, Restaurant Admin, Waiter, Kitchen, Reception.
9. End-to-end workflow tests and final build/type checks.
