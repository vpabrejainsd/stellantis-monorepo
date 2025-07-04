export function ProgressBar({
  value,
  color,
}: {
  value: number;
  color?: string;
}) {
  // Auto color: red < 50, yellow < 80, green >= 80
  let barColor = color;
  if (!color) {
    if (value < 50) barColor = "bg-red-500";
    else if (value < 80) barColor = "bg-yellow-400";
    else barColor = "bg-green-500";
  }

  return (
    <div className="h-3 w-full rounded bg-gray-200">
      <div
        className={`h-3 rounded transition-all ${barColor}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
