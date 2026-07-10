import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, orders } from "@/db";
import DisputeForm from "./dispute-form";

export default async function ReportProblemPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) notFound();

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-dark">Report a problem</h1>
      <p className="mt-1 text-sm text-ink-muted">Order #{order.id.slice(0, 8)}</p>
      <DisputeForm orderId={orderId} />
    </div>
  );
}
