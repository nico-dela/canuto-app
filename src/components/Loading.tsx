export function Spinner({
  size = "md",
  onDark = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`canuto-spinner canuto-spinner-${size}${onDark ? " canuto-spinner-on-dark" : ""} ${className}`}
    />
  );
}

export function LoadingState({
  label = "Cargando…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-10 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" />
      <p className="text-[14px] font-semibold text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function EventListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-2 md:grid-cols-2" aria-busy="true" aria-label="Cargando planes">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-stretch gap-3 rounded-2xl bg-[var(--surface)] p-2 pr-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-[4.5rem] w-[4.5rem] shrink-0 animate-pulse rounded-xl bg-[var(--line)]" />
          <div className="flex min-w-0 flex-1 flex-col justify-center space-y-2">
            <div className="h-4 w-[72%] animate-pulse rounded-md bg-[var(--line)]" />
            <div className="h-3 w-[40%] animate-pulse rounded-md bg-[var(--line)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
