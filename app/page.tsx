import Link from "next/link";
import { CATEGORIES, CATEGORY_BLURBS } from "@/lib/categories";
import { PRICING_TIERS } from "@/lib/pricing";

export default function Home() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-bold text-forest-dark">
          Sella
        </span>
        <Link href="/my/login" className="text-xs text-ink-muted underline">
          Store owner login
        </Link>
      </header>

      <section className="px-6 py-14 text-center">
        <h1 className="mx-auto max-w-xl text-4xl font-bold text-forest-dark">
          Your business deserves a real online store.
        </h1>
        <p className="mt-3 text-ink-muted">
          Live in 15 minutes · GHS 466/month · First month free.
        </p>
        <form
          action="/my/login"
          method="get"
          className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row"
        >
          <input
            type="tel"
            name="phone"
            required
            placeholder="024 123 4567"
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-forest"
          />
          <button
            type="submit"
            className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-gold-ink"
          >
            Start my free month
          </button>
        </form>
        <p className="mt-3 text-xs text-ink-muted">
          No card required. Cancel anytime.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <h2 className="text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
          How it works
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            { step: "1", label: "Sign up with your phone" },
            { step: "2", label: "Add your products" },
            { step: "3", label: "Share your link and sell" },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-forest-tint text-sm font-bold text-forest-dark">
                {item.step}
              </div>
              <p className="mt-2 text-sm font-semibold text-ink">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Built for your business
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link
              key={category.value}
              href={`/my/new?category=${category.value}`}
              className="rounded-lg border border-border bg-surface p-4 hover:border-forest"
            >
              <p className="font-semibold text-ink">{category.label}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {CATEGORY_BLURBS[category.value]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Pricing
        </h2>
        <p className="mt-2 text-center text-sm text-ink-muted">
          First month free on every plan. No transaction fee — ever.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.key}
              className={`rounded-lg border p-5 ${
                tier.highlighted ? "border-forest bg-forest-tint" : "border-border bg-surface"
              }`}
            >
              {tier.highlighted && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-forest">
                  Most popular
                </p>
              )}
              <p className="font-semibold text-ink">{tier.name}</p>
              <p className="mt-2">
                <span className="text-sm text-ink-muted line-through">GHS {tier.listPrice}</span>{" "}
                <span className="text-2xl font-bold text-forest-dark">GHS {tier.promoPrice}</span>
                <span className="text-sm text-ink-muted">/month</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                or GHS {tier.annualPrice}/year — 2 months free
              </p>
              <ul className="mt-4 flex flex-col gap-1.5 text-sm text-ink">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-forest-dark">
              Sella
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-muted">
              Operated by StormGlide (stormglide.io). Company registration and physical address
              are pending — see the legal-foundation checklist in Part 3 §7.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-xs text-ink-muted">
            <p>MTN MoMo · Telecel Cash · AT Money · Paystack · Visa · Mastercard</p>
            <div className="flex gap-3">
              <Link href="/terms" className="underline">
                Terms
              </Link>
              <Link href="/privacy" className="underline">
                Privacy
              </Link>
              <Link href="/my/login" className="underline">
                Store owner login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
