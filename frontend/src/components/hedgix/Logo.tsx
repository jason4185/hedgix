type Props = { className?: string; title?: string };

/**
 * Hedgix logo mark.
 * Concept: capital H whose right stem doubles as a protective boundary that
 * intercepts a descending market line. The intercept point is marked to
 * signal "protection engaged".
 */
export function LogoMark({ className = "h-7 w-7", title = "Hedgix" }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <title>{title}</title>
      {/* Left stem of the H */}
      <path d="M6 4 V28" />
      {/* Right stem — also acts as the protective boundary */}
      <path d="M22 4 V28" />
      {/* Crossbar */}
      <path d="M6 16 H22" />
      {/* Descending market line intercepted by the right stem */}
      <path d="M10 10 L16 14 L22 20" />
      {/* Intercept point — protection engaged */}
      <circle cx="22" cy="20" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-serif text-[1.35rem] font-medium leading-none tracking-tight ${className}`}
    >
      Hedgix
    </span>
  );
}

export function FullLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-ink ${className}`}>
      <LogoMark className="h-7 w-7" />
      <Wordmark />
    </span>
  );
}
