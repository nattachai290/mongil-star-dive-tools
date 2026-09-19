import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { EQUIPMENT, EQUIPMENT_SETS, piecesOfSet } from "@/lib/data";
import { describeEffect } from "@/lib/describe";
import { label } from "@/lib/vocabulary";
import type { EquipmentSet } from "@/lib/schema/entities";

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
        ชื่อบนหน้านี้ยังไม่มีภาษาไทยเลยสักอัน ป้าย "ยังไม่แปล" รายชิ้นจึงขึ้นครบทุกบรรทัด
        จนอ่านไม่ออก — บอกครั้งเดียวตรงนี้แทน และบอกเฉพาะตอนที่ยังขาดจริง
      */}
      {missingThai && locale === "th" && (
        <p className="mt-1 max-w-2xl text-xs text-muted">{t("equipment.enOnlyNote")}</p>
      )}

      {EQUIPMENT_SETS.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("equipment.empty")}</p>
      ) : (
        GRADES.map((grade) => {
          const sets = EQUIPMENT_SETS.filter((s) => s.grade === grade);
          if (sets.length === 0) return null;
          return (
            <section key={grade} className="mt-8">
              <h2 className="font-display text-sm font-semibold text-ink-2">
                {label("gearGrade", grade, locale)}{" "}
                <span className="font-mono text-xs font-normal text-muted">{sets.length}</span>
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {sets.map((set) => (
                  <SetCard key={set.id} set={set} locale={locale} t={t} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
