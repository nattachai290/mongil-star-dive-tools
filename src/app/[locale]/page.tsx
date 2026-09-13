import { notFound } from "next/navigation";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import { isLocale } from "@/lib/i18n";
import { SECTIONS } from "@/lib/sections";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale);

  return (
    <div className="mx-auto max-w-5xl px-5">
      <section className="border-b border-line py-14">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold">{t("home.eyebrow")}</p>
        <h1 className="mt-4 font-display text-3xl leading-tight font-bold text-balance sm:text-4xl">
          {t("home.title")}
        </h1>
        <p className="mt-4 max-w-prose text-ink-2">{t("home.lede")}</p>
      </section>

      <section className="py-12">
        <h2 className="font-display text-lg font-semibold">{t("home.sections")}</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <li key={section.slug} className="flex flex-col gap-2 rounded border border-line bg-surface p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-base font-semibold">
                  <Text value={section.title} locale={locale} />
                </h3>
                {!section.ready && (
                  <span className="shrink-0 rounded-full bg-gold-bg px-2.5 py-0.5 font-mono text-[11px] text-gold">
                    {t("nav.comingSoon")}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-ink-2">
                <Text value={section.blurb} locale={locale} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pb-4">
        <h2 className="font-display text-lg font-semibold">{t("home.status")}</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">{t("home.statusBody")}</p>
      </section>
    </div>
  );
}
