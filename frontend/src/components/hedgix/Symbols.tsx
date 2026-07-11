export const Sym = {
  Triangle: ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 3 L18 17 H2 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Diamond: ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 2 L18 10 L10 18 L2 10 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Cross: ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M10 2v16M2 10h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Dot: ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="4" fill="currentColor" />
    </svg>
  ),
  Arrow: ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 20" className={className} aria-hidden="true">
      <path d="M2 10h20M14 3l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};
