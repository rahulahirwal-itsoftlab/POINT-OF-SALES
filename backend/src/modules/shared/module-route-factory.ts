import { Hono } from "hono";

export function createModuleRoutes(moduleName: string) {
  const routes = new Hono();

  routes.get("/", (c) =>
    c.json({
      success: true,
      data: {
        module: moduleName,
        status: "scaffolded",
        next: "Add controller, service, repository, validation, and permission checks.",
      },
    }),
  );

  return routes;
}
