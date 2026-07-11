import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <section className="border-b border-hairline bg-amber">
      <div className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        {eyebrow && (
          <div className="mb-6 text-xs uppercase tracking-[0.22em] text-ink/70">{eyebrow}</div>
        )}
        <h1 className="max-w-4xl font-serif text-4xl leading-[1.02] tracking-tight text-ink md:text-6xl">
          {title}
        </h1>
        {lede && (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/80 md:text-lg">{lede}</p>
        )}
      </div>
    </section>
  );
}
