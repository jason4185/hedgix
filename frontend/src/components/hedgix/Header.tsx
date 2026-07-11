import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogoMark, Wordmark } from "./Logo";

const nav = [
  { label: "Products", to: "/products" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Markets", to: "/markets" },
  { label: "Transparency", to: "/transparency" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-30 border-b border-ink/10 bg-amber">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10 md:py-7">
        <Link to="/" className="flex items-center gap-2.5 text-ink" aria-label="Hedgix home">
          <LogoMark />
          <span className="hidden sm:inline-block">
            <Wordmark />
          </span>
        </Link>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {nav.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              className="text-sm text-ink/80 transition-colors hover:text-ink"
              activeProps={{ className: "text-ink font-medium" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/dashboard"
            className="border border-ink/30 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink/5"
          >
            View Dashboard
          </Link>
          <Link
            to="/protect"
            className="bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Get Protection
          </Link>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center border border-ink/30 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
            <path
              d={open ? "M2 2l12 8M2 10L14 2" : "M0 1h16M0 6h16M0 11h16"}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-ink/15 bg-amber md:hidden">
          <div className="flex flex-col px-6 py-4">
            {nav.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                className="border-b border-ink/10 py-3 text-sm text-ink"
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="border border-ink/30 px-4 py-2.5 text-center text-sm"
              >
                View Dashboard
              </Link>
              <Link
                to="/protect"
                onClick={() => setOpen(false)}
                className="bg-ink px-4 py-2.5 text-center text-sm text-paper"
              >
                Get Protection
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
