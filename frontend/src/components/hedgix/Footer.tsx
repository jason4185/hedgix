import { Link } from "@tanstack/react-router";
import { LogoMark, Wordmark } from "./Logo";

type Item = { label: string; to?: string; href?: string; disabled?: boolean };

const cols: { h: string; links: Item[] }[] = [
  {
    h: "Protocol",
    links: [
      { label: "Products", to: "/products" },
      { label: "How It Works", to: "/how-it-works" },
      { label: "Markets", to: "/markets" },
      { label: "Transparency", to: "/transparency" },
    ],
  },
  {
    h: "App",
    links: [
      { label: "Get Protection", to: "/protect" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Registry", to: "/registry" },
    ],
  },
  {
    h: "Resources",
    links: [
      { label: "Documentation", to: "/docs" },
      { label: "GenLayer", href: "#", disabled: true },
      { label: "GitHub", href: "#", disabled: true },
      { label: "Contract Explorer", href: "#", disabled: true },
    ],
  },
];

function FooterLink({ item }: { item: Item }) {
  const base = "text-sm text-paper/85 hover:text-paper";
  if (item.to)
    return (
      <Link to={item.to} className={base}>
        {item.label}
      </Link>
    );
  if (item.disabled)
    return (
      <span
        className="cursor-not-allowed text-sm text-paper/40"
        aria-disabled="true"
        title="Coming soon"
      >
        {item.label}
      </span>
    );
  return (
    <a href={item.href} className={base}>
      {item.label}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Hedgix home">
              <LogoMark className="h-8 w-8" />
              <Wordmark className="text-2xl" />
            </Link>
            <p className="mt-8 max-w-sm font-serif text-2xl leading-tight text-paper md:text-3xl">
              Defined protection. <span className="italic">Verified</span> data. Transparent
              settlement.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8 md:col-span-7">
            {cols.map((c) => (
              <div key={c.h}>
                <div className="mb-4 text-[10px] uppercase tracking-[0.24em] text-paper/50">
                  {c.h}
                </div>
                <ul className="space-y-3">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <FooterLink item={l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-paper/15 pt-6 text-xs text-paper/50 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Hedgix Protocol · v1</span>
          <span>Example data shown for illustration. Not investment advice.</span>
        </div>
      </div>
    </footer>
  );
}
