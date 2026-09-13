import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonsterlingList, type MonsterlingRow } from "@/components/MonsterlingList";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, pickText, type Locale } from "@/lib/i18n";
import { DEX, LINK_CHAINS, MONSTERLINGS, monsterlingImage } from "@/lib/data";
import { describeEffect } from "@/lib/describe";
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
  return { title: t("monsterlings.title"), description: t("monsterlings.lede") };
}

const CHAIN_IDS = linkableIds(LINK_CHAINS);
const BOOKS = ["field", "legendary", "event"] as const;

/** แปลงข้อมูลเป็นแถวที่พร้อมแสดง — ทำฝั่งเซิร์ฟเวอร์ เบราว์เซอร์จะได้ไม่ต้องรู้จักพจนานุกรม */
function buildRows(locale: Locale, bookLabel: (book: string) => string): MonsterlingRow[] {
  const rows: MonsterlingRow[] = [];

  for (const book of BOOKS) {
    for (const entry of DEX.filter((d) => d.book === book)) {
      const slug = entry.slug;
      const mon = slug ? MONSTERLINGS.get(slug) : undefined;
      const picked = pickText(entry.name, locale);
      const effects = (mon?.speciesEffects ?? []).map((e) => describeEffect(e, locale));

      rows.push({
        key: `${entry.book}-${entry.no}`,
        book,
        bookLabel: bookLabel(book),
        no: entry.no,
        name: picked?.value ?? slug ?? "",
        nameIsFallback: picked?.isFallback ?? false,
        image: slug ? monsterlingImage(slug) : null,
        badge: slug ? (linkableBadge(linkableOf(slug, CHAIN_IDS))?.[locale] ?? null) : null,
        effects,
        // ค้นได้ทั้งสองภาษาและค้นจากข้อความเอฟเฟกต์ด้วย เช่นพิมพ์ "คริ" หรือ "boss"
        haystack: [
          entry.name.th,
          entry.name.en,
          slug,
          `no.${entry.no}`,
          ...effects.flatMap((e) => [e.headline, ...e.qualifiers]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      });
    }
  }

  return rows;
}

export default async function MonsterlingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);

  const rows = buildRows(locale, (book) => t(`book.${book}` as "book.field"));
  const withEffects = rows.filter((r) => r.effects.length > 0).length;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("monsterlings.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("monsterlings.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">
          {withEffects} / {rows.length}
        </strong>{" "}
        {t("monsterlings.coverage")} · {t("monsterling.rankNote")}
      </p>

      <MonsterlingList
        rows={rows}
        locale={locale}
        labels={{
          search: t("monsterlings.search"),
          matches: t("monsterlings.matches"),
          noMatch: t("monsterlings.noMatch"),
          noEffect: t("monsterlings.noEffect"),
          untranslated: t("locale.untranslated"),
          untranslatedTitle: t("locale.untranslatedTitle"),
        }}
      />
    </div>
  );
}
