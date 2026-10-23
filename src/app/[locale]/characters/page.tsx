import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilteredList, type FilteredRow } from "@/components/FilteredList";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { CHARACTERS, characterImage, charactersSorted } from "@/lib/data";
import { byNumberDesc, haystackOf, optionsFrom } from "@/lib/facets";
import { label } from "@/lib/vocabulary";
import type { Character } from "@/lib/schema/entities";
import type { Effect } from "@/lib/schema/common";

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
  return { title: t("characters.title"), description: t("characters.lede") };
}

/** เอฟเฟกต์ทุกอันที่ตัวละครมี — สกิล ปลุกพลัง และสถานะ (ไม่รวม otherStats ซึ่งเป็นค่าพลังของตัวเอง) */
function allEffects(c: Character): Effect[] {
  const skills = Object.values(c.skills ?? {}).flatMap((s) => s?.effects ?? []);
  const awaken = (c.awaken ?? []).flatMap((a) => a.effects ?? []);
  const statuses = (c.statuses ?? []).flatMap((s) => s.effects ?? []);
  return [...skills, ...awaken, ...statuses];
}

/**
 * "ให้อะไรกับทีม" — เอฟเฟกต์ที่ผลไปลงเพื่อน (team / ally)
 * คนจัดทีมถามหา "ใครเพิ่ม ATK ให้ทั้งทีม" มากกว่าบัฟที่ตัวเองได้
 */
function teamStats(c: Character): string[] {
  return [
    ...new Set(
      allEffects(c)
        .filter((e) => (e.target === "team" || e.target === "ally") && e.stat)
        .map((e) => e.stat as string),
    ),
  ];
}

function CharacterCard({ c, locale, t }: { c: Character; locale: Locale; t: ReturnType<typeof createTranslate> }) {
  const image = characterImage(c.id);
  return (
    <li>
      <Link
        href={`/${locale}/characters/${c.id}`}
        className="flex gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {image ? (
          <Image
            src={image}
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 rounded bg-surface-2 object-cover"
          />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded bg-surface-2 text-center text-[10px] leading-tight text-muted">
            {t("character.noImage")}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">
            <Text value={c.name} locale={locale} />
          </p>
          {c.rarity !== undefined && (
            <p className="mt-1 text-xs text-gold">
              {"★".repeat(c.rarity)}{" "}
              <span className="text-muted">
                {c.rarity} {t("character.stars")}
              </span>
            </p>
          )}
          <ul className="mt-2 flex flex-wrap gap-1">
            {[
              label("element", c.element, locale),
              label("role", c.role, locale),
              ...(c.range ? [label("range", c.range, locale)] : []),
            ].map((chip) => (
              <li
                key={chip}
                className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] leading-tight text-ink-2"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </Link>
    </li>
  );
}

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);
  const characters = charactersSorted(locale);

  const rows: FilteredRow[] = characters.map((c) => ({
    key: c.id,
    facets: {
      stars: c.rarity !== undefined ? [String(c.rarity)] : [],
      element: [c.element],
      role: [c.role],
      range: c.range ? [c.range] : [],
      team: teamStats(c),
    },
    haystack: haystackOf([
      c.id,
      c.name.th,
      c.name.en,
      ...(["th", "en"] as const).flatMap((l) => [
        label("element", c.element, l),
        label("role", c.role, l),
        c.range ? label("range", c.range, l) : undefined,
      ]),
      ...Object.values(c.skills ?? {}).flatMap((s) => [s?.name.th, s?.name.en]),
    ]),
    card: <CharacterCard key={c.id} c={c} locale={locale as Locale} t={t} />,
  }));

  const facets = [
    { key: "stars", param: "r", legend: t("filters.stars"),
      options: optionsFrom(rows, "stars", (v) => `${"★".repeat(Number(v))} ${v}`, byNumberDesc) },
    { key: "element", param: "el", legend: t("filters.element"),
      options: optionsFrom(rows, "element", (v) => label("element", v, locale)) },
    { key: "role", param: "role", legend: t("filters.role"),
      options: optionsFrom(rows, "role", (v) => label("role", v, locale)) },
    { key: "range", param: "rng", legend: t("filters.range"),
      options: optionsFrom(rows, "range", (v) => label("range", v, locale)) },
    { key: "team", param: "team", legend: t("filters.teamBuff"),
      options: optionsFrom(rows, "team", (v) => label("stat", v, locale)) },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("characters.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("characters.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">{CHARACTERS.length}</strong> {t("characters.count")}
      </p>

      {characters.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("characters.empty")}</p>
      ) : (
        <FilteredList
          idPrefix="characters"
          rows={rows}
          facets={facets}
          listClassName="mt-6 grid gap-3 sm:grid-cols-2"
          labels={{
            search: t("characters.search"),
            matches: t("characters.matches"),
            noMatch: t("characters.noMatch"),
            filters: t("filters.legend"),
            any: t("filters.any"),
            clear: t("filters.clear"),
          }}
        />
      )}
    </div>
  );
}
