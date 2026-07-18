import type { ReactNode } from "react";
import { mapHedgixError, type HedgixMappedError } from "@/lib/genlayer/errors";

export function TechnicalDetails({
  label = "Technical details",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <details className="mt-3 text-xs text-muted-ink">
      <summary className="cursor-pointer text-ink">{label}</summary>
      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-mono">{children}</pre>
    </details>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mt-8 border border-dashed border-hairline bg-paper p-8 text-center md:p-12">
      <h3 className="font-serif text-2xl text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-ink">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ title, body }: { title: string; body?: ReactNode }) {
  return (
    <div className="mt-8 border border-hairline bg-stone p-8" aria-live="polite">
      <div className="h-1 w-24 overflow-hidden bg-hairline">
        <div className="h-full w-1/2 animate-pulse bg-ink" />
      </div>
      <h3 className="mt-5 font-serif text-2xl text-ink">{title}</h3>
      {body ? <p className="mt-3 text-sm leading-relaxed text-muted-ink">{body}</p> : null}
    </div>
  );
}

export function ContractErrorMessage({
  error,
  mapped,
  className = "",
}: {
  error?: unknown;
  mapped?: HedgixMappedError | null;
  className?: string;
}) {
  const resolved = mapped ?? mapHedgixError(error);
  const tone =
    resolved.severity === "info"
      ? "border-ink/20 bg-stone"
      : resolved.severity === "warning"
        ? "border-amber-deep/40 bg-amber/25"
        : "border-danger/30 bg-danger/10";

  return (
    <div className={`border p-5 text-sm ${tone} ${className}`} role="alert">
      <div className="font-medium text-ink">{resolved.title}</div>
      <p className="mt-2 leading-relaxed text-muted-ink">{resolved.description}</p>
      {resolved.action ? <p className="mt-2 text-ink">{resolved.action}</p> : null}
      {import.meta.env.DEV ? (
        <TechnicalDetails>
          {resolved.code}
          {"\n"}
          {resolved.raw}
        </TechnicalDetails>
      ) : null}
    </div>
  );
}
