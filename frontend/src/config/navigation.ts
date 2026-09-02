export const navigationSections = [
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
      { label: "Notifications", href: "/kitchen/notifications" },
    ],
  },
] as const;
