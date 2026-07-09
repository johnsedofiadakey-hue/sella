import { NextRequest, NextResponse } from "next/server";

// Part 2 §1: one wildcard domain, no per-store DNS work. A request to
// amasfashion.shoplocal.app is resolved here to /store/amasfashion. The
// actual tenant lookup stays in the page/route rather than here, so this
// stays a pure routing decision regardless of which runtime Proxy uses.
const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "shoplocal.app";

// Names no merchant can claim: platform surfaces and obvious impersonation risk.
const RESERVED_SLUGS = new Set([
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
]);

function slugFromHostname(hostname: string): string | null {
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) return null;
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null;

  const slug = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
  if (!slug || slug.includes(".") || RESERVED_SLUGS.has(slug)) return null;
  return slug;
}

export function proxy(req: NextRequest) {
  const hostname = (req.headers.get("host") ?? "").split(":")[0];
  const { pathname, searchParams } = req.nextUrl;

  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1";
  const slug = isLocalDev
    ? searchParams.get("store") // dev fallback: http://localhost:3000/?store=amas-fashion
    : slugFromHostname(hostname);

  if (!slug || RESERVED_SLUGS.has(slug)) {
    return NextResponse.next();
  }

  const headers = new Headers(req.headers);
  headers.set("x-tenant-slug", slug);

  // API routes and anything already under /store resolve the tenant from the
  // header themselves — only rewrite page paths so URLs stay clean per store.
  if (pathname.startsWith("/api") || pathname.startsWith("/store")) {
    return NextResponse.next({ request: { headers } });
  }

  const url = req.nextUrl.clone();
  url.pathname = `/store/${slug}${pathname}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: [
    // Skip static assets and Next internals — everything else gets tenant-resolved.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
