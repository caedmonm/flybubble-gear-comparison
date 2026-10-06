export default function NumericAvailability({
  bounds,
  unit = "",
}: {
  bounds: number[] | null;
  unit?: string;
}) {
  return (
    <p className="filter-hint">
      {bounds
        ? "(" +
          bounds.map((n) => Number(n.toFixed(3))).join("–") +
          (unit ? " " + unit : "") +
          ")"
        : "No matching specifications."}
    </p>
  );
}
