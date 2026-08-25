export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl"
          style={{ background: "linear-gradient(90deg, var(--surface), var(--surface-strong), var(--surface))" }}
        />
      ))}
    </div>
  );
}
