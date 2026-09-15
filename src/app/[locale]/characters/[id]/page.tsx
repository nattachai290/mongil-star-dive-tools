import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Text } from "@/components/Text";
import { ShowFullButton } from "@/components/ShowFullButton";
import { ViewSwitch } from "@/components/ViewSwitch";
import { createTranslate, type MessageKey } from "@/i18n";
import { LOCALES, LOCALE_TAG, isLocale, pickText, type Locale } from "@/lib/i18n";
import { CHARACTERS, characterById, characterImage } from "@/lib/data";
import { describeEffect } from "@/lib/describe";
import { label } from "@/lib/vocabulary";
import type { Effect } from "@/lib/schema/common";
import type { Skill } from "@/lib/schema/entities";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => CHARACTERS.map((c) => ({ locale, id: c.id })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const character = characterById(id);
  if (!character) return {};
  const name = pickText(character.name, locale)?.value ?? id;
  return { title: name, description: createTranslate(locale)("characters.lede") };
}

/** ห้าช่องบนจอสกิล เรียงตามที่เกมเรียง ไม่ใช่ตามลำดับตัวอักษร */
const SKILL_SLOTS = [
  ["basic", "skill.basic"],
  ["switch", "skill.switch"],
  ["special", "skill.special"],
  ["ultimate", "skill.ultimate"],
  ["passive", "skill.passive"],
] as const;

function EffectList({ effects, locale }: { effects: Effect[]; locale: Locale }) {
  if (effects.length === 0) return null;
  return (
    <ul className="space-y-2">
      {effects.map((effect, i) => {
        const said = describeEffect(effect, locale);
        return (
          <li key={i}>
            <p className="text-sm leading-relaxed text-ink">{said.headline}</p>
            {said.qualifiers.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-1">
                {said.qualifiers.map((q) => (
                  <li
                    key={q}
                    className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] leading-tight text-ink-2"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * ตารางค่าของสกิล — แสดงเฉพาะเลเวลที่มีค่าจริง
 *
 * scaling ยาว 16 ช่องเสมอ แต่ส่วนใหญ่เป็น null เพราะอ่านได้ทีละเลเวล
 * ถ้าวาดครบ 16 คอลัมน์จะได้ตารางที่ว่าง 15 ช่อง และดูเหมือนข้อมูลหาย
 * จึงวาดเฉพาะเลเวลที่อ่านมาแล้ว และบอกตรง ๆ ว่าที่เหลือคือยังไม่ได้อ่าน
 */
/**
 * ตัดคำอธิบายเป็นบรรทัดตาม "/" ที่เกมใส่มาเอง
 *
 * ไม่ใช่การย่อความ — เป็นการใช้ตัวคั่นที่มีอยู่แล้วในข้อความ
 * จำนวนท่อนตรงกันทั้งไทยและอังกฤษทุกสกิล จึงเชื่อได้ว่าเป็นโครงของเกม
 * ไม่ใช่นิสัยการเว้นวรรคของคนแปล
 *
 * ห้ามเขียนประโยคย่อขึ้นมาเอง ข้อความสกิลต้องเป็นคำของเกมเท่านั้น
 */
function descLines(desc: string): string[] {
  return desc
    .split("/")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * เลเวลสูงสุดที่อ่านค่ามาแล้วของสกิลนี้ — null = ยังไม่มีตัวเลขสักบรรทัด
 *
 * มุมมองสรุปโชว์เลเวลเดียว จึงต้องเลือกให้ชัดว่าเลเวลไหน แทนที่จะหยิบมามั่ว
 * เลือกเลเวลสูงสุดเพราะเป็นค่าที่ใกล้เพดานที่สุดเท่าที่อ่านมา
 */
function topLevel(skill: Skill): number | null {
  let top: number | null = null;
  for (const value of skill.values) {
    for (const [i, n] of value.scaling.entries()) {
      if (n !== null && (top === null || i + 1 > top)) top = i + 1;
    }
  }
  return top;
}

/** คำอธิบายแบบเต็ม — แยกเป็นบรรทัดตามที่เกมคั่นไว้ อ่านง่ายกว่าย่อหน้าก้อนเดียว */
function SkillDesc({
  skill,
  locale,
  t,
}: {
  skill: Skill;
  locale: Locale;
  t: (k: MessageKey) => string;
}) {
  const picked = pickText(skill.desc, locale);
  if (!picked) return null;
  const lines = descLines(picked.value);
  const lang = picked.isFallback ? LOCALE_TAG[picked.usedLocale] : undefined;

  if (lines.length <= 1) {
    return (
      <p className="mt-2 text-sm leading-relaxed text-ink-2" lang={lang}>
        {lines[0] ?? picked.value}
      </p>
    );
  }

  return (
    <>
      <p className="mt-2 font-mono text-[11px] text-muted">
        {lines.length} {t("character.descLines")}
      </p>
      <ul className="mt-1 space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-2">
            <span aria-hidden className="select-none text-muted">
              ·
            </span>
            <span lang={lang}>{line}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** มุมมองสรุป — บรรทัดแรกของคำอธิบายตามที่เกมเขียน บวกตัวเลขทุกบรรทัดเป็นชิป */
function SkillSummary({
  skill,
  slotLabel,
  locale,
  t,
}: {
  skill: Skill;
  slotLabel: string;
  locale: Locale;
  t: (k: MessageKey) => string;
}) {
  const lv = topLevel(skill);
  const chips =
    lv === null
      ? []
      : skill.values.flatMap((value) => {
          const n = value.scaling[lv - 1];
          if (n === null) return [];
          const unit = label("unit", value.unit, locale);
          return [{ label: value.label, text: `${n}${unit === "%" ? unit : ` ${unit}`}` }];
        });

  const picked = pickText(skill.desc, locale);
  const lines = picked ? descLines(picked.value) : [];

  return (
    <article className="rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-xs text-muted">{slotLabel}</span>
        {lv !== null && (
          <span className="font-mono text-[11px] text-muted">
            {t("character.level")} {lv}
          </span>
        )}
      </div>
      <h3 className="font-display text-sm font-semibold">
        <Text value={skill.name} locale={locale} />
        {skill.damageType && (
          <span className="ms-2 rounded bg-gold-bg px-1.5 py-0.5 align-middle text-[11px] font-normal text-gold">
            {label("damageType", skill.damageType, locale)}
          </span>
        )}
      </h3>

      {lines.length > 0 && (
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
          <span lang={picked?.isFallback ? LOCALE_TAG[picked.usedLocale] : undefined}>
            {lines[0]}
          </span>
          {/* บอกตรง ๆ ว่ายังมีอีกกี่บรรทัด ดีกว่าตัดทิ้งเงียบ ๆ แล้วคนอ่านไม่รู้ */}
          {lines.length > 1 && (
            <ShowFullButton count={lines.length - 1} label={t("character.moreLines")} />
          )}
        </p>
      )}

      {chips.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <li
              key={i}
              className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] leading-tight text-ink-2"
            >
              <Text value={chip.label} locale={locale} showFallbackBadge={false} />{" "}
              <span className="font-mono text-ink">{chip.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">{t("character.noValues")}</p>
      )}
    </article>
  );
}

function SkillValues({ skill, locale, t }: { skill: Skill; locale: Locale; t: (k: MessageKey) => string }) {
  if (skill.values.length === 0) return null;

  const levels = [...new Set(skill.values.flatMap((v) =>
    v.scaling.flatMap((n, i) => (n === null ? [] : [i + 1])),
  ))].sort((a, b) => a - b);

  if (levels.length === 0) {
    return <p className="mt-3 text-xs text-muted">{t("character.noValues")}</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto">
      {/* ห้ามตั้ง min-width ให้ตาราง — ตอนมีเลเวลเดียวมันจะดันคอลัมน์ค่าหลุดจอมือถือ
          ปล่อยให้ชื่อบรรทัดตัดคำเอา แล้วค่อยเลื่อนแนวนอนเมื่อเลเวลเยอะจริง */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th scope="col" className="w-full py-1.5 pe-3 font-medium">
              &nbsp;
            </th>
            {levels.map((lv) => (
              <th key={lv} scope="col" className="py-1.5 pe-3 text-end font-mono font-medium whitespace-nowrap">
                {t("character.level")} {lv}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skill.values.map((value, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              <th scope="row" className="py-1.5 pe-3 text-start font-normal text-ink-2">
                <Text value={value.label} locale={locale} />
              </th>
              {levels.map((lv) => {
                const n = value.scaling[lv - 1];
                const unit = label("unit", value.unit, locale);
                return (
                  <td key={lv} className="py-1.5 pe-3 text-end font-mono whitespace-nowrap">
                    {n === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <>
                        {n}
                        {/* "%" ติดเลขได้ แต่ "วินาที" / "seconds" ต้องมีช่องไฟ */}
                        <span className="text-muted">
                          {unit === "%" ? unit : ` ${unit}`}
                        </span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const character = characterById(id);
  if (!character) notFound();

  const t = createTranslate(locale as Locale);
  const image = characterImage(character.id);
  const { stats } = character;

  const statRows: [string, string][] = stats
    ? [
        [label("stat", "hp", locale), stats.hp.toLocaleString(locale === "th" ? "th-TH" : "en-US")],
        [label("stat", "atk", locale), stats.atk.toLocaleString(locale === "th" ? "th-TH" : "en-US")],
        [label("stat", "def", locale), stats.def.toLocaleString(locale === "th" ? "th-TH" : "en-US")],
        [label("stat", "critRate", locale), `${stats.critRate}%`],
        [label("stat", "critDmg", locale), `${stats.critDmg}%`],
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Link
        href={`/${locale}/characters`}
        className="text-sm text-muted underline underline-offset-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        ← {t("character.back")}
      </Link>

      <div className="mt-4 flex flex-wrap items-start gap-4">
        {image ? (
          <Image
            src={image}
            alt=""
            width={96}
            height={96}
            className="size-24 shrink-0 rounded-lg bg-surface-2 object-cover"
          />
        ) : (
          <div className="grid size-24 shrink-0 place-items-center rounded-lg bg-surface-2 px-2 text-center text-xs leading-tight text-muted">
            {t("character.noImage")}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">
            <Text value={character.name} locale={locale} />
          </h1>
          <p className="mt-1 text-sm text-gold">
            {"★".repeat(character.rarity)}{" "}
            <span className="text-muted">
              {character.rarity} {t("character.stars")}
            </span>
          </p>
          <ul className="mt-2 flex flex-wrap gap-1">
            {[
              label("element", character.element, locale),
              label("role", character.role, locale),
              ...(character.range ? [label("range", character.range, locale)] : []),
            ].map((chip) => (
              <li
                key={chip}
                className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {stats && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-semibold text-ink-2">
            {t("character.baseStats")}{" "}
            <span className="font-mono text-xs font-normal text-muted">
              {t("character.atLevel")} {stats.atLevel}
            </span>
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {statRows.map(([name, value]) => (
              <div key={name} className="rounded-lg border border-line bg-surface p-3">
                <dt className="text-xs text-muted">{name}</dt>
                <dd className="mt-0.5 font-mono text-sm text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {character.otherStats.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-semibold text-ink-2">
            {t("character.otherStats")}{" "}
            <span className="font-mono text-xs font-normal text-muted">
              {character.otherStats.length}
            </span>
          </h2>
          <div className="mt-3 rounded-lg border border-line bg-surface p-4">
            <EffectList effects={character.otherStats} locale={locale} />
          </div>
        </section>
      )}

      {character.skills && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-semibold text-ink-2">{t("character.skills")}</h2>

          {/*
            เรนเดอร์ทั้งสองมุมมองจากฝั่งเซิร์ฟเวอร์แล้วให้ ViewSwitch เลือกโชว์
            เพราะทั้งคู่ต้องใช้พจนานุกรม ซึ่งไม่ควรส่งไปทั้งก้อนให้เบราว์เซอร์
          */}
          <ViewSwitch
            labels={{
              legend: t("view.legend"),
              summary: t("view.summary"),
              full: t("view.full"),
            }}
            summary={
              <>
                <div className="space-y-2">
                  {SKILL_SLOTS.map(([slot, slotKey]) => {
                    const skill = character.skills?.[slot];
                    if (!skill) return null;
                    return (
                      <SkillSummary
                        key={slot}
                        skill={skill}
                        slotLabel={t(slotKey)}
                        locale={locale}
                        t={t}
                      />
                    );
                  })}
                </div>
              </>
            }
            full={
              <>
                <p className="text-xs text-muted">{t("character.skillValuesNote")}</p>
                <div className="mt-3 space-y-3">
                  {SKILL_SLOTS.map(([slot, slotKey]) => {
                    const skill = character.skills?.[slot];
                    if (!skill) return null;
                    return (
                      <article key={slot} className="rounded-lg border border-line bg-surface p-4">
                        <p className="text-xs text-muted">{t(slotKey)}</p>
                        <h3 className="font-display text-sm font-semibold">
                          <Text value={skill.name} locale={locale} />
                          {skill.damageType && (
                            <span className="ms-2 rounded bg-gold-bg px-1.5 py-0.5 align-middle text-[11px] font-normal text-gold">
                              {label("damageType", skill.damageType, locale)}
                            </span>
                          )}
                        </h3>
                        <SkillDesc skill={skill} locale={locale} t={t} />
                        {skill.effects.length > 0 && (
                          <div className="mt-3 border-t border-line pt-3">
                            <EffectList effects={skill.effects} locale={locale} />
                          </div>
                        )}
                        <SkillValues skill={skill} locale={locale} t={t} />
                      </article>
                    );
                  })}
                </div>
              </>
            }
          />
        </section>
      )}

      {character.statuses.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-semibold text-ink-2">
            {t("character.statuses")}{" "}
            <span className="font-mono text-xs font-normal text-muted">
              {character.statuses.length}
            </span>
          </h2>
          <ul className="mt-3 space-y-3">
            {character.statuses.map((status, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface p-4">
                <h3 className="font-display text-sm font-semibold">
                  <Text value={status.name} locale={locale} />
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  <Text value={status.desc} locale={locale} />
                </p>
                {status.effects.length > 0 && (
                  <div className="mt-3 border-t border-line pt-3">
                    <EffectList effects={status.effects} locale={locale} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {character.awaken.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-semibold text-ink-2">
            {t("character.awaken")}{" "}
            <span className="font-mono text-xs font-normal text-muted">
              {character.awaken.length} / 6
            </span>
          </h2>
          <ol className="mt-3 space-y-3">
            {[...character.awaken]
              .sort((a, b) => a.stage - b.stage)
              .map((stage) => (
                <li key={stage.stage} className="rounded-lg border border-line bg-surface p-4">
                  <p className="font-mono text-xs text-gold">
                    {t("character.stage")} {stage.stage}
                  </p>
                  {stage.name && (
                    <h3 className="font-display text-sm font-semibold">
                      <Text value={stage.name} locale={locale} />
                    </h3>
                  )}
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">
                    <Text value={stage.desc} locale={locale} />
                  </p>
                  {stage.skillLevelBonus !== undefined && (
                    <p className="mt-2 text-xs text-muted">
                      {t("character.skillLevelBonus")} +{stage.skillLevelBonus}
                    </p>
                  )}
                  {stage.effects.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3">
                      <EffectList effects={stage.effects} locale={locale} />
                    </div>
                  )}
                </li>
              ))}
          </ol>
        </section>
      )}

      {/*
        บล็อก "ที่มาข้อมูล" ถูกถอดออกจากหน้าเว็บตามที่เจ้าของเว็บสั่ง (2026-09-15)
        ข้อมูลยังอยู่ครบใน data/characters/*.json ช่อง source
        ทั้ง verifiedAt, gameVersion, readIn และ note — validate:data ยังบังคับให้มีเหมือนเดิม
        เป็นของหลังบ้านสำหรับคนลงข้อมูล ไม่ใช่ของที่คนเล่นต้องอ่าน
      */}
    </div>
  );
}
