export const navigationSections = [
  {
    label: "Franchise Steward",
    roles: ["FRANCHISE_STEWARD"],
    items: [
      { label: "Dashboard", href: "/franchise-steward/dashboard" },
      { label: "Super Admins", href: "/franchise-steward/super-admins" },
      { label: "License & Subscription", href: "/franchise-steward/license" },
      { label: "Notifications", href: "/franchise-steward/notifications" },
      { label: "Audit Logs", href: "/franchise-steward/audit-logs" },
    ],
  },
  {
    label: "Platform",
    roles: ["SUPER_ADMIN"],
    items: [
      { label: "Dashboard", href: "/super-admin/dashboard" },
      { label: "Restaurants", href: "/super-admin/restaurants" },
      { label: "Subscriptions", href: "/super-admin/subscriptions" },
      { label: "Licenses", href: "/super-admin/licenses" },
      { label: "Notifications", href: "/super-admin/notifications" },
      { label: "Settings", href: "/super-admin/settings" },
    ],
  },
  {
    label: "Restaurant Admin",
    roles: ["RESTAURANT_ADMIN"],
    items: [
      { label: "Dashboard", href: "/restaurant-admin/dashboard" },
      { label: "Staff", href: "/restaurant-admin/staff" },
      { label: "Menu", href: "/admin/menu" },
      {
        label: "Inventory & Recipes",
        href: "/restaurant-admin/inventory",
        items: [
          { label: "Overview & Analytics", href: "/restaurant-admin/inventory" },
          { label: "Inventory Categories", href: "/restaurant-admin/inventory/categories" },
          { label: "Inventory Items / Stock", href: "/restaurant-admin/inventory/items" },
          { label: "Stock Movements Audit", href: "/restaurant-admin/inventory/movements" },
          { label: "Recipe Book & Costing", href: "/restaurant-admin/inventory/recipes" },
        ],
      },
      { label: "Bills", href: "/restaurant-admin/bills" },
      { label: "Subscription", href: "/restaurant-admin/subscription" },
      { label: "Notifications", href: "/restaurant-admin/notifications" },
      { label: "Audit Logs", href: "/restaurant-admin/audit-logs" },
    ],
  },
  {
    label: "Receptionist",
    roles: ["RECEPTION"],
    items: [
      { label: "Dashboard", href: "/receptionist/dashboard" },
      { label: "Menu", href: "/receptionist/menu" },
      { label: "Orders", href: "/receptionist/orders" },
      { label: "Bills", href: "/receptionist/bills" },
      { label: "Tables", href: "/receptionist/tables" },
      { label: "Customers", href: "/receptionist/customers" },
      { label: "Notifications", href: "/receptionist/notifications" },
    ],
  },
  {
    label: "Waiter",
    roles: ["WAITER"],
    items: [
      { label: "Customers", href: "/waiter/customers" },
      { label: "Tables", href: "/waiter/tables" },
      { label: "Menu", href: "/waiter/menu" },
      { label: "Notifications", href: "/waiter/notifications" },
    ],
  },
  {
    label: "Kitchen",
    roles: ["KITCHEN"],
    items: [
      { label: "Kitchen Orders", href: "/kitchen/orders" },
      {
        label: "Inventory & Recipes",
        href: "/kitchen/inventory",
        items: [
          { label: "Overview & Analytics", href: "/kitchen/inventory" },
          { label: "Inventory Items / Stock", href: "/kitchen/inventory/items" },
          { label: "Recipe Book & Costing", href: "/kitchen/inventory/recipes" },
        ],
      },
      { label: "Notifications", href: "/kitchen/notifications" },
    ],
  },
] as const;
