import Link from "next/link";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import type { Locale } from "@/lib/i18n";
import { SECTIONS } from "@/lib/sections";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = createTranslate(locale);

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <Link
          href={`/${locale}`}
          className="font-display text-sm font-semibold tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          MONGIL<span className="text-gold">:</span> STAR DIVE
        </Link>

        <nav aria-label={t("nav.label")} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {SECTIONS.map((section) =>
            section.ready ? (
              <Link
                key={section.slug}
                href={`/${locale}/${section.slug}`}
                className="text-ink-2 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <Text value={section.title} locale={locale} showFallbackBadge={false} />
              </Link>
            ) : (
              <span key={section.slug} className="text-muted" title={t("nav.comingSoon")}>
                <Text value={section.title} locale={locale} showFallbackBadge={false} />
              </span>
            ),
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <LocaleSwitcher locale={locale} />
          <ThemeToggle locale={locale} />
        </div>
      </div>
    </header>
  );
}
