// Names no merchant can claim as a store slug — platform surfaces and
// obvious impersonation risk (Part 2 §1). Shared between proxy.ts (routing)
// and lib/slug.ts (so a store can never collide with a reserved name).
export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mission-control",
  "my",
  "shoplocal",
  "stormglide",
  "assets",
  "static",
  "cdn",
  "mail",
  "support",
  "help",
  "status",
  "blog",
  "store",
  "track",
  "terms",
  "privacy",
]);

// Subdomains that resolve to a fixed internal surface rather than a merchant
// store. The portal (Part 2 §8) ships this week; Mission Control (Part 2 §7)
// joins this map when it's built in Month 4 of the execution plan.
export const SUBDOMAIN_ROUTES: Record<string, string> = {
  my: "/my",
};
