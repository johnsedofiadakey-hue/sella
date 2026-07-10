export default function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}
