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
  "sella",
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
// store — the portal (Part 2 §8) and Mission Control (Part 2 §7).
export const SUBDOMAIN_ROUTES: Record<string, string> = {
  my: "/my",
  "mission-control": "/mission-control",
};
