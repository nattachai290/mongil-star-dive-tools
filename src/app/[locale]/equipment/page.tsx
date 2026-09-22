import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EquipmentList, type EquipmentRow } from "@/components/EquipmentList";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { EQUIPMENT, EQUIPMENT_SETS, GEAR_MAIN_STATS, GEAR_SUBSTATS, piecesOfSet } from "@/lib/data";
import { describeEffect } from "@/lib/describe";
import { label } from "@/lib/vocabulary";
import type { EquipmentSet } from "@/lib/schema/entities";

/**
 * ค่าที่ใช้กรอง — คิดฝั่งเซิร์ฟเวอร์เหมือน haystack ด้วยเหตุผลเดียวกัน
 *
 * เป็นลิสต์ทุกช่องเพราะเซ็ตหนึ่งมีได้สองโบนัส แต่ละโบนัสมีได้หลายเอฟเฟกต์
 * และเซ็ตสี่ชิ้นก็ครอบสี่ช่องอุปกรณ์ การกรองจึงเป็น "มีอย่างน้อยหนึ่งอันที่ตรง"
 */
function facetsOfSet(set: EquipmentSet, slots: string[]): Record<string, string[]> {
  const stat = new Set<string>();
  const damageType = new Set<string>();
  const trigger = new Set<string>();
  const target = new Set<string>();

  for (const bonus of set.bonuses) {
    for (const e of bonus.effects) {
      if (e.stat) stat.add(e.stat);
      if (e.damageType) damageType.add(e.damageType);
      if (e.trigger) trigger.add(e.trigger);
      if (e.target) target.add(e.target);
      // ธาตุของสถานะที่ศัตรูต้องติด นับเป็นธาตุของเซ็ตด้วย เพราะคนเล่นที่ถามหา
      // "เซ็ตธาตุไฟ" ย่อมอยากเจอเซ็ตที่ต้องให้ศัตรูติดสถานะอ่อนแอต่อไฟเหมือนกัน
      const c = e.condition;
      if (c?.triggerEnemyAffliction) damageType.add(c.triggerEnemyAffliction);
      if (c?.triggerDamageType) damageType.add(c.triggerDamageType);
    }
  }

  return {
    grade: [set.grade],
    pieces: [String(set.pieceCount)],
    slot: slots,
    stat: [...stat],
    damageType: [...damageType],
    trigger: [...trigger],
    target: [...target],
  };
}

/** ตัวเลือกในดรอปดาวน์มาจากค่าที่มีจริงในข้อมูล ไม่ใช่จากพจนานุกรมทั้งกลุ่ม */
function optionsFrom(rows: EquipmentRow[], key: string, toLabel: (v: string) => string) {
  const count = new Map<string, number>();
  for (const row of rows) {
    for (const v of row.facets[key] ?? []) count.set(v, (count.get(v) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, n]) => ({ value, label: toLabel(value), count: n }));
}

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
  return { title: t("equipment.title"), description: t("equipment.lede") };
}

/** ม่วงก่อนทอง ตามลำดับที่จอคราฟต์เรียง ไม่ใช่เอาของดีขึ้นก่อน */
const GRADES = ["purple", "gold"] as const;

/** ลำดับช่องบนตัวละคร ใช้เรียงตารางค่าหลักให้ตรงกับที่เกมวาง */
const SLOT_ORDER = ["headgear", "chestpiece", "gloves", "footwear"] as const;

function SetCard({ set, locale, t }: { set: EquipmentSet; locale: Locale; t: (k: "equipment.setBonus") => string }) {
  const pieces = piecesOfSet(set.id);

  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="font-display text-sm font-semibold">
          <Text value={set.name} locale={locale} showFallbackBadge={false} />
        </h3>
        {set.stars !== undefined && <span className="text-xs text-gold">{"★".repeat(set.stars)}</span>}
        <span className="font-mono text-[11px] text-muted">
          {label("gearGrade", set.grade, locale)}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {set.bonuses.map((bonus, i) => {
          const said = bonus.effects.map((e) => describeEffect(e, locale));
          return (
            <li key={i} className="border-s-2 border-line ps-2.5">
              <p className="font-mono text-[11px] text-gold">
                {t("equipment.setBonus")} {bonus.pieces}
              </p>
              {said.length > 0 ? (
                said.map((s, j) => (
                  <div key={j}>
                    <p className="text-sm leading-relaxed text-ink">{s.headline}</p>
                    {s.qualifiers.length > 0 && (
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {s.qualifiers.map((q) => (
                          <li
                            key={q}
                            className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] leading-tight text-ink-2"
                          >
                            {q}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                /* ยังแปลงเป็นโครงข้อมูลไม่ได้ จึงแสดงข้อความตามจอไปก่อน */
                <p className="text-sm leading-relaxed text-ink-2">
                  <Text value={bonus.desc} locale={locale} />
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {pieces.length > 0 && (
        <ul className="mt-3 grid gap-1.5 border-t border-line pt-3 sm:grid-cols-2">
          {pieces.map((piece) => (
            <li key={piece.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-mono text-[11px] text-muted">
                {label("slot", piece.slot, locale)}
              </span>
              <span className="text-ink-2">
                <Text value={piece.name} locale={locale} showFallbackBadge={false} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function EquipmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);
  const missingThai =
    EQUIPMENT_SETS.some((s) => !s.name.th) || EQUIPMENT.some((e) => !e.name.th);

  const other = locale === "th" ? "en" : "th";
  const rows: EquipmentRow[] = [];
  for (const grade of GRADES) {
    for (const set of EQUIPMENT_SETS.filter((s) => s.grade === grade)) {
      const pieces = piecesOfSet(set.id);
      const said = set.bonuses.flatMap((b) => b.effects.map((e) => describeEffect(e, locale)));
      // ข้อความของ "อีกภาษา" ไม่ได้แสดงบนหน้า แต่ต้องค้นเจอ ไม่งั้นพิมพ์ค้างไว้แล้วสลับภาษา
      // คำค้นจะรอดข้ามหน้าไปแต่หาอะไรไม่เจอเลย — เหตุผลเดียวกับหน้ามอน
      const saidOther = set.bonuses.flatMap((b) => b.effects.map((e) => describeEffect(e, other)));
      rows.push({
        key: set.id,
        grade,
        gradeLabel: label("gearGrade", grade, locale),
        facets: facetsOfSet(set, pieces.map((p) => p.slot)),
        haystack: [
          set.name.th,
          set.name.en,
          set.id,
          ...pieces.flatMap((p) => [p.name.th, p.name.en]),
          ...set.bonuses.flatMap((b) => [b.desc?.th, b.desc?.en]),
          ...said.flatMap((s) => [s.headline, ...s.qualifiers]),
          ...saidOther.flatMap((s) => [s.headline, ...s.qualifiers]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        card: <SetCard key={set.id} set={set} locale={locale} t={t} />,
      });
    }
  }

  const facets = [
    { key: "grade", param: "g", legend: t("filters.grade"),
      options: optionsFrom(rows, "grade", (v) => label("gearGrade", v, locale)) },
    { key: "pieces", param: "n", legend: t("filters.pieces"),
      options: optionsFrom(rows, "pieces", (v) => `${v} ${t("equipment.pieces")}`) },
    { key: "slot", param: "slot", legend: t("filters.slot"),
      options: optionsFrom(rows, "slot", (v) => label("slot", v, locale)) },
    { key: "stat", param: "stat", legend: t("filters.stat"),
      options: optionsFrom(rows, "stat", (v) => label("stat", v, locale)) },
    { key: "damageType", param: "dmg", legend: t("filters.damageType"),
      options: optionsFrom(rows, "damageType", (v) => label("damageType", v, locale)) },
    { key: "trigger", param: "trig", legend: t("filters.trigger"),
      options: optionsFrom(rows, "trigger", (v) => label("trigger", v, locale)) },
    { key: "target", param: "for", legend: t("filters.target"),
      options: optionsFrom(rows, "target", (v) => label("target", v, locale)) },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("equipment.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("equipment.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">{EQUIPMENT_SETS.length}</strong> {t("equipment.sets")} ·{" "}
        <strong className="text-ink">{EQUIPMENT.length}</strong> {t("equipment.pieces")}
      </p>
      <p className="mt-1 max-w-2xl text-xs text-muted">{t("equipment.rolledNote")}</p>

      {/*
        ค่าหลักผูกกับช่องกับระดับ ไม่ได้ผูกกับชิ้น จึงอยู่ตรงนี้ครั้งเดียว
        ไม่ใช่ซ้ำอยู่ในการ์ดทุกใบ — ตารางเดียวตอบได้ทั้งหน้า
      */}
      <section className="mt-5 rounded-lg border border-line bg-surface p-4">
        <h2 className="font-display text-sm font-semibold">{t("equipment.mainStats")}</h2>
        <p className="mt-1 text-xs text-muted">{t("equipment.mainStatNote")}</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-start text-[11px] uppercase tracking-wide text-muted">
              <th scope="col" className="py-1 text-start font-medium">{t("filters.slot")}</th>
              <th scope="col" className="py-1 text-start font-medium">{t("filters.stat")}</th>
              {GRADES.map((g) => (
                <th key={g} scope="col" className="py-1 text-end font-medium">
                  {label("gearGrade", g, locale)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOT_ORDER.map((slot) => {
              const byGrade = GRADES.map((g) =>
                GEAR_MAIN_STATS.find((m) => m.slot === slot && m.grade === g),
              );
              const stat = byGrade.find(Boolean)?.stat;
              if (!stat) return null;
              return (
                <tr key={slot} className="border-t border-line">
                  <td className="py-1.5 text-ink-2">{label("slot", slot, locale)}</td>
                  <td className="py-1.5 text-ink-2">{label("stat", stat, locale)}</td>
                  {byGrade.map((m, i) => (
                    <td key={GRADES[i]} className="py-1.5 text-end font-mono tabular-nums text-ink">
                      {m ? m.atMaxLevel.toLocaleString(locale === "th" ? "th-TH" : "en-US") : "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/*
        ออปชันรองก็เป็นของกลางเหมือนค่าหลัก — เจ้าของข้อมูลยืนยันว่าทั้งสี่ช่องใช้ตารางเดียวกัน
        น้ำหนักของชั้นเป็นสัดส่วนคงที่ บอกครั้งเดียวในคำอธิบายแทนที่จะพิมพ์ 55 แถว
      */}
      {GEAR_SUBSTATS.length > 0 && (
        <section className="mt-4 rounded-lg border border-line bg-surface p-4">
          <h2 className="font-display text-sm font-semibold">{t("equipment.substats")}</h2>
          <p className="mt-1 text-xs text-muted">{t("equipment.substatNote")}</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted">
                <th scope="col" className="py-1 text-start font-medium">{t("equipment.option")}</th>
                <th scope="col" className="py-1 text-end font-medium">{t("equipment.chance")}</th>
                {GRADES.map((g) => (
                  <th key={g} scope="col" className="py-1 text-end font-medium">
                    {label("gearGrade", g, locale)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/*
                โอกาสของสองระดับเท่ากันทุกออปชัน (validate:data เตือนถ้าวันหนึ่งไม่เท่า)
                จึงรวมเป็นคอลัมน์เดียว แล้วแยกคอลัมน์เฉพาะตัวเลขค่าที่ต่างกันจริง
              */}
              {GEAR_SUBSTATS.filter((r) => r.grade === GRADES[0]).map((first, i) => {
                const byGrade = GRADES.map((g) =>
                  GEAR_SUBSTATS.find(
                    (r) => r.grade === g && r.stat === first.stat && r.damageType === first.damageType,
                  ),
                );
                const name = first.damageType
                  ? `${label("stat", first.stat, locale)} ${label("damageType", first.damageType, locale)}`
                  : label("stat", first.stat, locale);
                const suffix = first.unit === "percent" ? "%" : "";
                return (
                  <tr key={i} className="border-t border-line align-baseline">
                    <td className="py-1.5 pe-2 text-ink-2">{name}</td>
                    <td className="py-1.5 pe-2 text-end font-mono tabular-nums text-ink">
                      {first.chancePercent}%
                    </td>
                    {byGrade.map((r, j) => (
                      <td
                        key={GRADES[j]}
                        className="py-1.5 ps-2 text-end font-mono text-[11px] tabular-nums text-muted"
                      >
                        {r ? r.tiers.map((x) => `${x.atLevel1}${suffix}`).join(" · ") : "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
      {/*
        ชื่อบนหน้านี้ยังไม่มีภาษาไทยเลยสักอัน ป้าย "ยังไม่แปล" รายชิ้นจึงขึ้นครบทุกบรรทัด
        จนอ่านไม่ออก — บอกครั้งเดียวตรงนี้แทน และบอกเฉพาะตอนที่ยังขาดจริง
      */}
      {missingThai && locale === "th" && (
        <p className="mt-1 max-w-2xl text-xs text-muted">{t("equipment.enOnlyNote")}</p>
      )}

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("equipment.empty")}</p>
      ) : (
        <EquipmentList
          rows={rows}
          facets={facets}
          labels={{
            search: t("equipment.search"),
            matches: t("equipment.matches"),
            noMatch: t("equipment.noMatch"),
            filters: t("filters.legend"),
            any: t("filters.any"),
            clear: t("filters.clear"),
          }}
        />
      )}
    </div>
  );
}
