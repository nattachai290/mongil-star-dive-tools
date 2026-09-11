import Link from "next/link";
import { SECTIONS } from "@/lib/sections";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <Link
          href="/"
          className="font-display text-sm font-semibold tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          MONGIL<span className="text-gold">:</span> STAR DIVE
        </Link>

        <nav aria-label="หมวดข้อมูล" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {SECTIONS.map((section) =>
            section.ready ? (
              <Link
                key={section.slug}
                href={`/${section.slug}`}
                className="text-ink-2 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                {section.title}
              </Link>
            ) : (
              <span key={section.slug} className="text-muted" title="ยังไม่เปิด">
                {section.title}
              </span>
            ),
          )}
        </nav>

        <div className="ms-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
