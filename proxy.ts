import { NextRequest, NextResponse } from "next/server";
import { RESERVED_SLUGS, SUBDOMAIN_ROUTES } from "@/lib/reserved-slugs";

// Part 2 §1: one wildcard domain, no per-store DNS work. A request to
// amasfashion.sella.app is resolved here to /store/amasfashion. The
// actual tenant lookup stays in the page/route rather than here, so this
// stays a pure routing decision regardless of which runtime Proxy uses.
const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "sella.app";

function slugFromHostname(hostname: string): string | null {
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) return null;
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) return null;

  const slug = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
  if (!slug || slug.includes(".")) return null;
  return slug;
}

export function proxy(req: NextRequest) {
  const hostname = (req.headers.get("host") ?? "").split(":")[0];
  const { pathname, searchParams } = req.nextUrl;

  const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1";
  const slug = isLocalDev
    ? searchParams.get("store") // dev fallback: http://localhost:3000/?store=amas-fashion
    : slugFromHostname(hostname);

  if (!slug) return NextResponse.next();

  const headers = new Headers(req.headers);

  // Fixed internal surfaces (the merchant portal today, Mission Control
  // later) live at a subdomain but aren't tenant stores — route by prefix,
  // no x-tenant-slug header.
  const internalPrefix = SUBDOMAIN_ROUTES[slug];
  if (internalPrefix) {
    if (pathname.startsWith(internalPrefix) || pathname.startsWith("/api")) {
      return NextResponse.next({ request: { headers } });
    }
    const url = req.nextUrl.clone();
    url.pathname = `${internalPrefix}${pathname}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  if (RESERVED_SLUGS.has(slug)) return NextResponse.next();

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

// Known debt: in-app storefront links (cart, checkout) are currently
// written as explicit /store/{slug}/... paths rather than clean relative
// ones (/cart, /checkout). That's harmless today — real wildcard subdomain
// DNS isn't live yet (Part 5 Phase 0) — but once it is, a clean link would
// still resolve correctly through this same rewrite, while an explicit
// /store/{slug}/... link leaks the internal path into the address bar on
// a real subdomain. Worth a pass before that DNS work ships.

export const config = {
  matcher: [
    // Skip static assets and Next internals — everything else gets tenant-resolved.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
