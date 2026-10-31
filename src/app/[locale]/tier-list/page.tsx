import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { characterById, characterImage } from "@/lib/data";
import { label } from "@/lib/vocabulary";
import { TIERS, tierList, type Tier, type TierEntry, type TierGroup, type TierRange } from "@/lib/tier-list";
import type { LocalizedText } from "@/lib/schema/common";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = createTranslate(locale);
  return { title: t("tierList.title"), description: t("tierList.lede") };
}

const name = (v: LocalizedText | undefined, locale: Locale, fallback: string) => v?.[locale] ?? v?.en ?? v?.th ?? fallback;

const TIER_STYLE: Record<Tier, string> = {
  "0": "bg-gold-bg text-gold border-gold",
  "1": "bg-surface-2 text-ink border-rail",
  "2": "bg-surface-2 text-ink border-rail/60",
  "3": "bg-surface-2 text-ink border-line",
  "4": "bg-surface-2 text-ink-2 border-line",
  "5": "bg-surface-2 text-ink-2 border-line",
  "6": "bg-surface-2 text-muted border-line",
  "7": "bg-surface-2 text-muted border-line",
};

type Chip = { entry: TierEntry; range: TierRange };

function ChipCard({ chip, locale, t }: { chip: Chip; locale: Locale; t: ReturnType<typeof createTranslate> }) {
  const c = characterById(chip.entry.characterId);
  const img = characterImage(chip.entry.characterId);
  const { from, to } = chip.range;
  const stages = from === to ? `${from}` : `${from}–${to}`;
  return (
    <li className="min-w-0">
      <Link
        href={`/${locale}/characters/${chip.entry.characterId}`}
        className="flex h-full min-h-14 items-center gap-2 rounded-xl border border-line bg-surface py-1.5 ps-1.5 pe-2 sm:gap-2.5 sm:pe-3 hover:border-rail focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail"
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="size-10 shrink-0 rounded-lg bg-surface-2" />
        )}
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight">
            {name(c?.name, locale, chip.entry.characterId)}
            {chip.entry.incomplete && (
              <span className="text-gold" title={t("tierList.incomplete")}>
                {" "}*
              </span>
            )}
          </span>
          <span className="block text-[11px] text-ink-2">
            <span className="whitespace-nowrap">{t("tierList.awaken").replace("{r}", stages)}</span>
            {/* บนมือถือการ์ดแคบ ชื่อบทบาทหักกลางคำ — โชว์เฉพาะจอกว้าง */}
            {c && <span className="hidden text-muted sm:inline"> · {label("role", c.role, locale)}</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Tier list — คิดจากตัวละคร สกิล และปลุกพลังอย่างเดียว (ผู้เล่นสั่ง 2026-10-31)
 * ตัวเดียวกันอยู่หลาย tier ได้ตามขั้นปลุกพลัง · ขั้นที่ tier เท่ากันรวมเป็นช่วง · วิธีคิดอยู่ใน src/lib/tier-list.ts
 */
export default async function TierListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslate(locale);

  const entries = tierList();
  const chips = (tier: Tier, group: TierGroup): Chip[] =>
    entries
      .filter((e) => e.group === group)
      .flatMap((entry) => entry.ranges.filter((r) => r.tier === tier).map((range) => ({ entry, range })))
      .sort((a, b) => b.range.score - a.range.score);
  const groups: TierGroup[] = ["dps", "support"];
  const anyIncomplete = entries.some((e) => e.incomplete);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold">{t("tierList.title")}</h1>
      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        <div className="hidden grid-cols-[4rem_1fr_1fr] border-b border-line bg-surface-2 text-xs font-semibold text-ink-2 md:grid">
          <span className="px-3 py-2" />
          {groups.map((g) => (
            <span key={g} className="px-3 py-2">
              {t(`tierList.group.${g}`)}
            </span>
          ))}
        </div>
        {TIERS.map((tier) => (
          <section
            key={tier}
            aria-label={`${t("tierList.tier")} ${tier}`}
            className="grid grid-cols-[3rem_1fr] border-b border-line last:border-b-0 md:grid-cols-[4rem_1fr_1fr]"
          >
            <div className={`row-span-2 flex items-start justify-center border-e-4 pt-4 font-display text-2xl font-bold md:row-span-1 ${TIER_STYLE[tier]}`}>
              {tier}
            </div>
            {groups.map((g, gi) => {
              const list = chips(tier, g);
              return (
                <div key={g} className={`min-w-0 border-line px-3 py-3 md:border-s ${gi > 0 ? "border-t md:border-t-0" : ""}`}>
                  <p className="mb-2 text-[11px] font-semibold text-muted md:hidden">{t(`tierList.group.${g}`)}</p>
                  {list.length === 0 ? (
                    <p className="text-xs text-muted">—</p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-2">
                      {list.map((chip) => (
                        <ChipCard key={`${chip.entry.characterId}-${chip.range.from}`} chip={chip} locale={locale} t={t} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
      {anyIncomplete && <p className="mt-3 text-xs text-ink-2">* {t("tierList.incomplete")}</p>}
    </div>
  );
}
