import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonsterlingList, type MonsterlingRow } from "@/components/MonsterlingList";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, pickText, type Locale } from "@/lib/i18n";
import { DEX, LINK_CHAINS, MONSTERLINGS, monsterlingImage } from "@/lib/data";
import type { Monsterling } from "@/lib/schema/entities";
import { describeEffect } from "@/lib/describe";
import { label } from "@/lib/vocabulary";
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

/**
 * ค่าที่ใช้กรอง — คิดฝั่งเซิร์ฟเวอร์เหมือน haystack ด้วยเหตุผลเดียวกัน
 * เบราว์เซอร์จะได้ไม่ต้องรับพจนานุกรมทั้งก้อนไปเพียงเพื่อกรอง
 *
 * เป็นลิสต์เพราะมอนหนึ่งตัวมีได้หลายเอฟเฟกต์ และแต่ละเอฟเฟกต์ก็มีได้หลายค่า
 */
type Facets = {
  stat: string[];
  damageType: string[];
  target: string[];
  enemy: string[];
  /**
   * สามอันล่างเป็น yes/no แต่เก็บเป็นลิสต์เหมือนอันบน
   * เพื่อให้การกรองมีทางเดินเดียว ไม่ต้องมีโค้ดเฉพาะกิจสำหรับ boolean
   */
  always: string[];
  link: string[];
};

function facetsOf(
  effects: Monsterling["speciesEffects"],
  linkable: boolean,
): Facets {
  const stat = new Set<string>();
  const damageType = new Set<string>();
  const target = new Set<string>();
  const enemy = new Set<string>();

  for (const e of effects) {
    if (e.stat) stat.add(e.stat);
    if (e.damageType) damageType.add(e.damageType);
    if (e.target) target.add(e.target);
    const c = e.condition;
    // ฝั่งกระตุ้นกับฝั่งผลรวมเป็นค่าเดียวกันตรงนี้ เพราะคำถามของคนเล่นคือ
    // "ตัวนี้เกี่ยวกับบอสไหม" ไม่ใช่ "บอสอยู่ข้างไหนของประโยค"
    if (c?.vsBoss !== undefined) enemy.add(c.vsBoss ? "boss" : "normal");
    if (c?.triggerVsBoss !== undefined) enemy.add(c.triggerVsBoss ? "boss" : "normal");
    if (c?.enemyState) enemy.add(c.enemyState);
  }

  // always/passive คือค่าเริ่มต้น describeEffect จึงไม่ขึ้นชิปให้
  // ตัวกรองนี้เลยเป็นทางเดียวที่จะหามอนกลุ่มนี้เจอ
  const alwaysOn =
    effects.length > 0 && effects.every((e) => e.trigger === "always" || e.trigger === "passive");

  return {
    stat: [...stat],
    damageType: [...damageType],
    target: [...target],
    enemy: [...enemy],
    // ตัวที่ยังไม่มีข้อมูลไม่ตอบทั้ง yes และ no เรื่องตัวกระตุ้น เพราะยังไม่รู้
    always: effects.length === 0 ? [] : [alwaysOn ? "yes" : "no"],
    link: [linkable ? "yes" : "no"],
  };
}

/** ตัวเลือกในดรอปดาวน์มาจากค่าที่มีจริงในข้อมูล ไม่ใช่จากพจนานุกรมทั้งกลุ่ม */
function optionsFrom(rows: MonsterlingRow[], key: keyof Facets, toLabel: (v: string) => string) {
  const count = new Map<string, number>();
  for (const row of rows) {
    for (const v of row.facets[key]) count.set(v, (count.get(v) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, n]) => ({ value, label: toLabel(value), count: n }));
}

/** แปลงข้อมูลเป็นแถวที่พร้อมแสดง — ทำฝั่งเซิร์ฟเวอร์ เบราว์เซอร์จะได้ไม่ต้องรู้จักพจนานุกรม */
function buildRows(locale: Locale, bookLabel: (book: string) => string): MonsterlingRow[] {
  const rows: MonsterlingRow[] = [];

  for (const book of BOOKS) {
    for (const entry of DEX.filter((d) => d.book === book)) {
      const slug = entry.slug;
      const mon = slug ? MONSTERLINGS.get(slug) : undefined;
      const picked = pickText(entry.name, locale);
      const effects = (mon?.speciesEffects ?? []).map((e) => describeEffect(e, locale));
      // ข้อความเอฟเฟกต์ของ "อีกภาษา" ไม่ได้แสดงบนหน้า แต่ต้องค้นเจอ
      // ไม่งั้นพิมพ์ "คริ" ค้างไว้แล้วสลับเป็นอังกฤษ คำค้นจะรอดข้ามหน้าไปแต่หาอะไรไม่เจอเลย
      const other = locale === "th" ? "en" : "th";
      const effectsOther = (mon?.speciesEffects ?? []).map((e) => describeEffect(e, other));

      // แปะป้ายเฉพาะตัวที่ใส่ได้ ไม่แปะ "ใส่ไม่ได้" ให้อีกร้อยกว่าใบจนรก
      // การไม่มีป้ายอ่านได้ว่า "ใส่ไม่ได้" เพราะยืนยันแล้วว่ารายการลิงก์เชนในเกมครบ
      const linkable = slug !== null && linkableOf(slug, CHAIN_IDS) === "yes";

      rows.push({
        key: `${entry.book}-${entry.no}`,
        facets: facetsOf(mon?.speciesEffects ?? [], linkable),
        book,
        bookLabel: bookLabel(book),
        no: entry.no,
        name: picked?.value ?? slug ?? "",
        nameIsFallback: picked?.isFallback ?? false,
        image: slug ? monsterlingImage(slug) : null,
        badge: linkable ? (linkableBadge("yes")?.[locale] ?? null) : null,
        effects,
        // ค้นได้ทั้งสองภาษาและค้นจากข้อความเอฟเฟกต์ด้วย เช่นพิมพ์ "คริ" หรือ "boss"
        haystack: [
          entry.name.th,
          entry.name.en,
          slug,
          `no.${entry.no}`,
          ...effects.flatMap((e) => [e.headline, ...e.qualifiers]),
          ...effectsOther.flatMap((e) => [e.headline, ...e.qualifiers]),
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
  const linkable = rows.filter((r) => r.badge !== null).length;

  // "มอนสเตอร์บอส/ทั่วไป" ไม่ได้อยู่ในพจนานุกรมเป็นคำเดี่ยว เพราะในข้อมูลมันคือ boolean
  const enemyLabel = (v: string) =>
    v === "boss" ? t("filters.boss") : v === "normal" ? t("filters.normal") : label("enemyState", v, locale);

  // ดรอปดาวน์ทุกอันมาจากโครงเดียวกัน ทั้งอันที่มีหลายค่าและอันที่เป็น yes/no
  // อันหลังเป็นดรอปดาวน์ไม่ใช่เช็กบ็อกซ์ เพราะเช็กบ็อกซ์บอกได้แค่ "เอา" กับ "ไม่สน"
  // แต่ "เอาเฉพาะตัวที่ต้องกระตุ้น" หรือ "เฉพาะตัวที่ใส่ลิงก์เชนไม่ได้" ก็เป็นคำถามจริง
  const yesNo = (yes: string, no: string) => (v: string) => (v === "yes" ? yes : no);

  const facets = [
    { key: "stat" as const, param: "stat", legend: t("filters.stat"),
      options: optionsFrom(rows, "stat", (v) => label("stat", v, locale)) },
    { key: "damageType" as const, param: "dmg", legend: t("filters.damageType"),
      options: optionsFrom(rows, "damageType", (v) => label("damageType", v, locale)) },
    { key: "target" as const, param: "for", legend: t("filters.target"),
      options: optionsFrom(rows, "target", (v) => label("target", v, locale)) },
    { key: "enemy" as const, param: "enemy", legend: t("filters.enemy"),
      options: optionsFrom(rows, "enemy", enemyLabel) },
    { key: "always" as const, param: "always", legend: t("filters.trigger"),
      options: optionsFrom(rows, "always", yesNo(t("filters.alwaysYes"), t("filters.alwaysNo"))) },
    { key: "link" as const, param: "link", legend: t("filters.linkChain"),
      options: optionsFrom(rows, "link", yesNo(t("filters.linkYes"), t("filters.linkNo"))) },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("monsterlings.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("monsterlings.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">
          {withEffects} / {rows.length}
        </strong>{" "}
        {t("monsterlings.coverage")} · <strong className="text-ink">{linkable}</strong>{" "}
        {t("monsterlings.linkable")} · {t("monsterling.rankNote")}
      </p>

      <MonsterlingList
        rows={rows}
        locale={locale}
        facets={facets}
        labels={{
          search: t("monsterlings.search"),
          matches: t("monsterlings.matches"),
          noMatch: t("monsterlings.noMatch"),
          noEffect: t("monsterlings.noEffect"),
          untranslated: t("locale.untranslated"),
          untranslatedTitle: t("locale.untranslatedTitle"),
          filters: t("filters.legend"),
          any: t("filters.any"),
          clear: t("filters.clear"),
        }}
      />
    </div>
  );
}
