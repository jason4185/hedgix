import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink">
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
      <div className="mx-auto min-w-0 max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        {eyebrow && (
          <div className="mb-6 text-xs uppercase tracking-[0.22em] text-ink/70">{eyebrow}</div>
        )}
        <h1 className="max-w-full whitespace-normal break-words font-serif text-3xl leading-[1.04] tracking-tight text-ink [overflow-wrap:anywhere] sm:max-w-4xl sm:text-4xl md:text-6xl">
          {title}
        </h1>
        {lede && (
          <p className="mt-6 max-w-full whitespace-normal break-words text-base leading-relaxed text-ink/80 [overflow-wrap:anywhere] sm:max-w-2xl md:text-lg">
            {lede}
          </p>
        )}
      </div>
    </section>
  );
}
