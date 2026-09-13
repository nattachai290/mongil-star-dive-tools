import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Text } from "@/components/Text";
import { EffectLine } from "@/components/EffectLine";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { DEX, LINK_CHAINS, MONSTERLINGS, monsterlingImage } from "@/lib/data";
import { linkableIds, linkableOf, linkableBadge } from "@/lib/linkable";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = createTranslate(locale);
  return {
    title: t("monsterlings.title"),
    description: t("monsterlings.lede"),
  };
}

const CHAIN_IDS = linkableIds(LINK_CHAINS);

export default async function MonsterlingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);
  const withEffects = DEX.filter(
    (d) => MONSTERLINGS.get(d.slug ?? "")?.speciesEffects.length,
  ).length;
  // แยกตามสมุด เพราะแต่ละเล่มเริ่มนับ No.1 ใหม่ ถ้าไหลต่อกันจะอ่านเลขแล้วงง
  const books = ["field", "legendary", "event"] as const;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">
        {t("monsterlings.title")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">
        {t("monsterlings.lede")}
      </p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">
          {withEffects} / {DEX.length}
        </strong>{" "}
        {t("monsterlings.coverage")} · {t("monsterling.rankNote")}
      </p>

      {books.map((book) => {
        const entries = DEX.filter((d) => d.book === book);
        if (entries.length === 0) return null;
        return (
          <section key={book} className="mt-8">
            <h2 className="font-display text-sm font-semibold text-ink-2">
              {t(`book.${book}` as "book.field")}{" "}
              <span className="font-mono text-xs font-normal text-muted">
                {entries.length}
              </span>
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {entries.map((entry) => {
                const slug = entry.slug;
                const mon = slug ? MONSTERLINGS.get(slug) : undefined;
                const image = slug ? monsterlingImage(slug) : null;
                const badge = slug
                  ? linkableBadge(linkableOf(slug, CHAIN_IDS))
                  : null;

                return (
                  <li
                    key={`${entry.book}-${entry.no}`}
                    className="flex gap-3 rounded-lg border border-line bg-surface p-3"
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 shrink-0 rounded bg-surface-2 object-contain"
                      />
                    ) : (
                      <div className="size-14 shrink-0 rounded bg-surface-2" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        {/* หัวข้อบอกชื่อสมุดแล้ว ตรงนี้เหลือแค่เลขพอ */}
                        <span className="font-mono text-xs text-muted">
                          No.{entry.no}
                        </span>
                        {badge && (
                          <span className="rounded bg-gold-bg px-1.5 py-0.5 text-[11px] text-gold">
                            {badge[locale]}
                          </span>
                        )}
                      </div>

                      <p className="font-display text-sm font-semibold">
                        <Text value={entry.name} locale={locale} />
                      </p>

                      {mon?.speciesEffects.length ? (
                        <div className="mt-2 space-y-2 border-t border-line pt-2">
                          {mon.speciesEffects.map((effect, i) => (
                            <EffectLine
                              key={i}
                              effect={effect}
                              locale={locale}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted">
                          {t("monsterlings.noEffect")}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
