import { db, tenants, products } from "./index";

async function main() {
  const [ama] = await db
    .insert(tenants)
    .values({
      slug: "amas-fashion",
      businessName: "Ama's Fashion",
      category: "fashion",
      status: "trial",
      ownerPhone: "+233241234567",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing({ target: tenants.slug })
    .returning();

  const tenant = ama ?? (await db.query.tenants.findFirst({ where: (t, { eq }) => eq(t.slug, "amas-fashion") }));
  if (!tenant) throw new Error("Failed to create or find seed tenant");

  await db.insert(products).values([
    {
      tenantId: tenant.id,
      name: "Ankara wrap dress",
      priceCents: 22000,
      attributes: { sizes: ["S", "M", "L"] },
    },
    {
      tenantId: tenant.id,
      name: "Kaba & slit",
      priceCents: 38000,
      attributes: { sizes: ["M", "L", "XL"], madeToOrder: true },
    },
  ]);

  console.log(`Seeded tenant "${tenant.businessName}" at slug "${tenant.slug}"`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
