export function ProgressBar({
  value,
}: {
  value: number;
}) {
  // always fill in black proportional to value
  return (
    <div className="h-3 w-full rounded bg-gray-200">
      <div
        className="h-3 rounded bg-black transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
