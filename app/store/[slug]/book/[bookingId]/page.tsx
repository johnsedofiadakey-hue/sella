import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, bookings, products } from "@/db";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; bookingId: string }>;
}) {
  const { bookingId } = await params;
  const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) });
  if (!booking) notFound();

  const product = booking.productId
    ? await db.query.products.findFirst({ where: eq(products.id, booking.productId) })
    : null;

  return (
    <div className="mx-auto w-full max-w-sm flex-1 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-forest-dark">Booking requested</h1>
      {product && <p className="mt-1 text-sm text-ink-muted">{product.name}</p>}
      <p className="mt-4 text-2xl font-bold text-forest">
        {booking.scheduledFor.toLocaleString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
      <p className="mt-4 text-sm text-ink-muted">
        The seller will confirm your time. They have your phone number if they need to reach you.
      </p>
    </div>
  );
}
