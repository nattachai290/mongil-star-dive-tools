import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AwakenOnly,
  AwakenPills,
  AwakenProvider,
  AwakenStatsTable,
  AwakenSwitch,
  AwakenText,
  MemberPanel,
  MemberTab,
  type StatRow,
} from "@/components/AwakenSelect";
import { EffectLine } from "@/components/EffectLine";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import {
  ARTIFACTS,
  BUILDS,
  EQUIPMENT,
  EQUIPMENT_SETS,
  FOOD,
  LINK_CHAINS,
  MONSTERLINGS,
  TRAIT_POOL,
  characterById,
  characterImage,
  minSubstat,
  monsterlingImage,
} from "@/lib/data";
import { asset } from "@/lib/base-path";
import { chainAppears } from "@/lib/link-chain-effects";
import {
  CYCLE_SKILLS,
  artifactFusion,
  awakenGroups,
  receivedEffects,
  specialCooldownReduction,
  statSheet,
  unusableReason,
  type StatSheet,
  type Tagged,
  type UnusableReason,
} from "@/lib/team-damage";
import { label } from "@/lib/vocabulary";
import type { BuildLoadout, BuildMember, Character, LinkChain } from "@/lib/schema/entities";
import type { Effect, LocalizedText } from "@/lib/schema/common";

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
  return { title: t("builds.title"), description: t("builds.lede") };
}

type T = ReturnType<typeof createTranslate>;

const SLOTS = ["headgear", "chestpiece", "gloves", "footwear"] as const;

const name = (v: LocalizedText | undefined, locale: Locale, fallback: string) =>
  v?.[locale] ?? v?.en ?? v?.th ?? fallback;

type MonSlot = BuildMember["monsterlings"][number];

/** ชิ้นต่อเซ็ตของตัวนี้ → โบนัสที่ทำงาน (ครบ 2 / 4 ชิ้น) */
function activeSets(lo: BuildMember) {
  const counts = new Map<string, number>();
  for (const slot of SLOTS) {
    const piece = EQUIPMENT.find((e) => e.id === lo.equipment[slot]);
    if (piece?.setId) counts.set(piece.setId, (counts.get(piece.setId) ?? 0) + 1);
  }
  return [...counts].flatMap(([setId, n]) => {
    const set = EQUIPMENT_SETS.find((s) => s.id === setId);
    return set ? [{ set, n, bonuses: set.bonuses.filter((b) => b.pieces <= n) }] : [];
  });
}

function Icon({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full border border-line bg-surface-2" />
  ) : (
    <span className="size-9 shrink-0 rounded-full border border-line bg-surface-2" />
  );
}

function Effects({ effects, locale }: { effects: Effect[]; locale: Locale }) {
  if (effects.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1.5">
      {effects.map((e, i) => (
        <EffectLine key={i} effect={e} locale={locale} />
      ))}
    </div>
  );
}

/** เหตุที่เอฟเฟกต์ใช้กับตัวนี้/ทีมนี้ไม่ได้ — undefined = ใช้ได้ */
type Why = (e: Effect) => UnusableReason | undefined;

/** เหมือน Effects แต่เอฟเฟกต์ที่ใช้ไม่ได้เป็นสีจาง พร้อมป้ายเหตุผลสั้น ๆ */
function CheckedEffects({ effects, why, locale, t }: { effects: Effect[]; why?: Why; locale: Locale; t: T }) {
  return (
    <>
      {effects.map((e, j) => {
        const reason = why?.(e);
        return reason ? (
          <div key={j} className="space-y-1">
            <div className="opacity-50">
              <Effects effects={[e]} locale={locale} />
            </div>
            <span className="inline-block rounded-full bg-gold-bg px-2 py-0.5 text-[11px] font-semibold text-gold">
              {t(`builds.unusable.${reason}`)}
            </span>
          </div>
        ) : (
          <Effects key={j} effects={[e]} locale={locale} />
        );
      })}
    </>
  );
}

/** ชิปเล็ก ๆ สำหรับค่าพลังและค่ารอง */
function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{children}</span>;
}

/** Trait 4 ช่องของมอน */
function Traits({ slot, locale }: { slot: MonSlot; locale: Locale }) {
  if (slot.traits.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {slot.traits.map((tr, i) => {
        const trait = TRAIT_POOL.pool.find((x) => x.id === tr.id);
        const value = trait ? trait.values[tr.grade as keyof typeof trait.values] : undefined;
        return (
          <li key={i} className="rounded-md bg-gold-bg px-1.5 py-0.5 text-[11px] text-ink">
            {name(trait?.name, locale, tr.id)}
            {value !== undefined && (
              <span className="font-mono text-gold">
                {" "}+{value}
                {trait?.unit === "percent" ? "%" : ""}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** มอนของตัวเอง — การ์ดเล็ก: ชื่อ เอฟเฟกต์สายพันธุ์ Trait */
function MonCard({ slot, locale, highlight, why, t }: { slot: MonSlot; locale: Locale; highlight: boolean; why?: Why; t: T }) {
  const m = MONSTERLINGS.get(slot.id);
  return (
    <li className={`min-w-0 space-y-2 rounded-xl border p-3 ${highlight ? "border-gold" : "border-line"}`}>
      <div className="flex items-center gap-2">
        <Icon src={monsterlingImage(slot.id)} />
        <span className="text-sm font-semibold">{name(m?.name, locale, slot.id)}</span>
      </div>
      <CheckedEffects effects={m?.speciesEffects ?? []} why={why} locale={locale} t={t} />
      <Traits slot={slot} locale={locale} />
    </li>
  );
}

/** ลิงก์เชน — มอนเจ้าของ เงื่อนไขปรากฏตัว ดาเมจ คูลดาวน์ และเอฟเฟกต์เพิ่มเติมของขั้นสูงสุดที่อ่านมา */
function ChainInfo({ chain, appears, locale, t }: { chain: LinkChain; appears: boolean; locale: Locale; t: T }) {
  const owner = MONSTERLINGS.get(chain.monsterlingId);
  const top = [...chain.levels].sort((a, b) => b.level - a.level)[0];
  const info = top
    ? [
        top.appearanceConditions.map((c) => label("appearanceCondition", c, locale)).join(" / "),
        top.appearanceInfo.dmgPercentOfAtk !== undefined ? `${t("linkChains.dmgOfAtk")} ${top.appearanceInfo.dmgPercentOfAtk}%` : null,
        top.appearanceInfo.cooldownSec !== undefined ? `${t("linkChains.cooldown")} ${top.appearanceInfo.cooldownSec}s` : null,
      ].filter(Boolean)
    : [];
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Icon src={monsterlingImage(chain.monsterlingId)} />
        <span className="text-base font-semibold">{name(chain.name, locale, chain.id)}</span>
        {chain.rarity !== undefined && <span className="text-xs text-gold">{"◆".repeat(chain.rarity)}</span>}
        {appears && (
          <span className="rounded-full bg-[#e3efdd] px-2 py-0.5 text-[11px] font-semibold text-[#2f5a23] dark:bg-[#22331d] dark:text-[#b7dca8]">
            {t("builds.chainAppears")}
          </span>
        )}
      </div>
      <p className="text-xs text-muted">
        {top && `${t("linkChains.level")} ${top.level} · `}
        {t("linkChains.owner")}: {name(owner?.name, locale, chain.monsterlingId)}
      </p>
      {info.length > 0 && <p className="text-ink-2">{info.join(" · ")}</p>}
      {top?.bonusEffects && top.bonusEffects.length > 0 && (
        <p className="text-ink-2">{top.bonusEffects.map((b) => name(b, locale, "")).join(" · ")}</p>
      )}
      {!appears && <p className="text-[11px] text-gold">{t("builds.chainNoAppear")}</p>}
    </div>
  );
}

/** การ์ดหัวข้อ — ใช้กับค่าพลังรวม */
function Slot({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * ค่าพลังรวม — ของที่ใส่อย่างเดียว เทียบกับรวมบัฟทั้งหมด + รายการบัฟแยกตามที่มา
 * combos: ทุกชุดค่าผสมขั้นปลุกพลัง · ตารางส่งไปแค่ตัวเลข ส่วนบัฟแต่ละกลุ่ม render ครั้งเดียวแล้วซ่อน/โชว์ตามชุดที่เลือก
 * (ผู้เล่นถาม 2026-10-31 ว่าหน้าใหญ่ไป)
 */
function StatsSlot({
  char,
  combos,
  locale,
  t,
}: {
  char: Character;
  combos: { key: string; effects: Tagged[] }[];
  locale: Locale;
  t: T;
}) {
  const roleStat = { fighter: "brawlDmg", assassin: "suppressionDmg", destroyer: "neutralizationDmg", supporter: "supportDmg" }[
    char.role as string
  ];
  const rows: (StatRow & { key: keyof StatSheet })[] = [
    { label: label("stat", "atk", locale), key: "atk", fmt: "num" },
    { label: label("stat", "def", locale), key: "def", fmt: "num" },
    { label: label("stat", "hp", locale), key: "hp", fmt: "num" },
    { label: label("stat", "critRate", locale), key: "critRate", fmt: "pct" },
    { label: label("stat", "critDmg", locale), key: "critDmg", fmt: "pct" },
    {
      label:
        locale === "en"
          ? `${label("element", char.element, locale)} ${t("builds.stats.element")}`
          : `${t("builds.stats.element")}${label("element", char.element, locale)}`,
      key: "elementDmg", fmt: "pct" },
    { label: t("builds.stats.basic"), key: "basicAttackDmg", fmt: "pct" },
    { label: t("builds.stats.skill"), key: "skillDmg", fmt: "pct" },
    { label: t("builds.stats.boss"), key: "bossDmg", fmt: "pct" },
    { label: t("builds.stats.weakness"), key: "weaknessDmg", fmt: "pct" },
    { label: t("builds.stats.dmgBonus"), key: "dmgBonus", fmt: "pct" },
    { label: t("builds.stats.mastery"), key: "roleMastery", fmt: "num" },
    ...(roleStat ? [{ label: label("stat", roleStat, locale), key: "roleDmg" as const, fmt: "pct" as const }] : []),
    { label: t("builds.stats.specialCd"), key: "specialCd", fmt: "sec" },
    { label: t("builds.stats.enemyDef"), key: "enemyDefDown", fmt: "pct" },
    { label: t("builds.stats.enemyRes"), key: "enemyResDown", fmt: "pct" },
  ];

  const values: Record<string, [number[], number[]]> = {};
  const counts: Record<string, string> = {};
  // บัฟ (ไม่ใช่ค่าพลังของของ) จัดกลุ่มตามที่มา — กลุ่มเดียวกันทุกชุดค่าผสม render ครั้งเดียว
  const groups = new Map<string, { from: LocalizedText; effects: Effect[]; combos: string[] }>();
  for (const { key, effects } of combos) {
    const gear = statSheet(char, effects, true);
    const all = statSheet(char, effects, false);
    values[key] = [rows.map((r) => gear[r.key]), rows.map((r) => all[r.key])];
    const mine = new Map<string, { from: LocalizedText; effects: Effect[] }>();
    for (const x of effects) {
      if (x.gear) continue;
      const k = `${x.from.th ?? ""}|${x.from.en ?? ""}`;
      if (!mine.has(k)) mine.set(k, { from: x.from, effects: [] });
      mine.get(k)!.effects.push(x.effect);
    }
    for (const g of mine.values()) {
      const id = JSON.stringify(g);
      if (!groups.has(id)) groups.set(id, { ...g, combos: [] });
      groups.get(id)!.combos.push(key);
    }
    counts[key] = String(mine.size);
  }
  const everywhere = combos.length;

  return (
    <Slot title={t("builds.stats")}>
      <AwakenStatsTable
        rows={rows.map(({ label: l, fmt }) => ({ label: l, fmt }))}
        values={values}
        head={[t("builds.stats.gear"), t("builds.stats.buffed")]}
        sec={t("builds.stats.sec")}
      />
      <p className="mt-2 text-[11px] text-muted">{t("builds.stats.note")}</p>
      {groups.size > 0 && (
        <details className="mt-3 border-t border-line pt-2">
          <summary className="cursor-pointer text-xs font-semibold text-ink-2">
            {t("builds.buffs")} (<AwakenText values={counts} />)
          </summary>
          <ul className="mt-2 space-y-3">
            {[...groups.values()].map((g, i) => {
              const body = (
                <>
                  <p className="text-xs font-semibold">{name(g.from, locale, "")}</p>
                  <Effects effects={g.effects} locale={locale} />
                </>
              );
              return (
                <li key={i}>{g.combos.length === everywhere ? body : <AwakenOnly combos={g.combos}>{body}</AwakenOnly>}</li>
              );
            })}
          </ul>
        </details>
      )}
    </Slot>
  );
}

/** หนึ่งแถวของของที่ใส่ — หัวข้อซ้าย เนื้อหาขวา (มือถือซ้อนกัน) */
function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-2 border-b border-line px-4 py-4 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:px-5">
      <h4 className="text-xs font-semibold text-muted sm:pt-1">{title}</h4>
      <div className="min-w-0 space-y-2">{children}</div>
    </div>
  );
}

/** ชื่อค่าพลังของอาร์ติแฟกต์/ค่ารอง */
function statName(stat: string, damageType: string | undefined, locale: Locale) {
  if (!damageType) return label("stat", stat, locale);
  return locale === "en"
    ? `${label("damageType", damageType, locale)} ${label("stat", stat, locale)}`
    : `${label("stat", stat, locale)}ธาตุ${label("damageType", damageType, locale)}`;
}

/**
 * ของที่ตัวละคร 1 ตัวใส่ เป็นแถว: อาร์ติแฟกต์ / อุปกรณ์ / มอน / ลิงก์เชน / มอนตำนาน
 * ช่องที่ว่างไม่โชว์เลย (ผู้เล่นสั่ง 2026-10-31 "ไม่มีก็เอา section ออกเลย")
 */
function GearRows({
  mem,
  effects,
  team,
  weaknessHit,
  staggerOften,
  dup,
  locale,
  t,
}: {
  mem: BuildMember;
  effects: Tagged[];
  team: Character[];
  weaknessHit: boolean;
  staggerOften: boolean;
  dup: Set<string>;
  locale: Locale;
  t: T;
}) {
  const c = characterById(mem.characterId);
  const cdCut = specialCooldownReduction(effects);
  const why: Why | undefined = c && ((e) => unusableReason(c, e, cdCut, team));
  const [art, ...spares] = (mem.artifacts ?? []).flatMap((id) => ARTIFACTS.find((a) => a.id === id) ?? []);
  const fusion = art && artifactFusion(art);
  const chain = LINK_CHAINS.find((x) => x.id === mem.linkChain);
  const sets = activeSets(mem);
  const legendary = mem.legendary && MONSTERLINGS.get(mem.legendary.id);

  // ค่ารอง — ทุกชิ้นเหมือนกันโชว์บรรทัดเดียว ไม่เหมือนโชว์รายชิ้น
  const subRows = SLOTS.flatMap((slot) => {
    const piece = EQUIPMENT.find((e) => e.id === mem.equipment[slot]);
    const keys = piece ? (mem.substats[slot] ?? []) : [];
    if (!piece || keys.length === 0) return [];
    const chips = keys.map((key) => {
      const sub = minSubstat(key, piece.grade, piece.stars);
      return `${statName(sub?.stat ?? key, sub?.damageType, locale)}${sub ? ` +${sub.min}${sub.unit === "percent" ? "%" : ""}` : ""}`;
    });
    return [{ slot, chips }];
  });
  const sameSubs = subRows.length === SLOTS.length && subRows.every((r) => r.chips.join() === subRows[0].chips.join());

  return (
    <>
      {art && (
        <Row title={t("builds.artifact")}>
          <div className="flex items-center gap-3">
            <Icon src={art.images?.icon ? asset(`/images/artifacts/${art.images.icon}`) : null} />
            <div className="min-w-0">
              <p className="text-base font-semibold">
                {name(art.name, locale, art.id)}{" "}
                <span className="text-xs font-normal text-gold">{art.stars !== undefined && "★".repeat(art.stars)}</span>
              </p>
              {fusion?.level !== undefined && (
                <p className="text-xs text-gold">
                  {t("builds.fusion")} {fusion.level}
                  {fusion.name && ` · ${name(fusion.name, locale, "")}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {art.stats.map((st, j) => (
              <Chip key={j}>
                {statName(st.stat, st.damageType, locale)} +{st.value.toLocaleString("en-US")}
                {st.unit === "percent" ? "%" : ""}
              </Chip>
            ))}
          </div>
          <CheckedEffects effects={fusion?.effects ?? []} why={why} locale={locale} t={t} />
          {spares.length > 0 && (
            <p className="text-xs text-muted">
              {t("builds.artifactAlt")}: {spares.map((a) => name(a.name, locale, a.id)).join(" · ")}
            </p>
          )}
        </Row>
      )}

      {(sets.length > 0 || subRows.length > 0) && (
        <Row title={t("builds.equipment")}>
          {sets.map(({ set, n, bonuses }) => (
            <div key={set.id} className="space-y-1.5">
              <p>
                <span className="text-base font-semibold">{name(set.name, locale, set.id)}</span>{" "}
                <span className="text-xs text-muted">
                  {n} {t("builds.pieces")}
                </span>
              </p>
              {bonuses.map((bonus) => (
                <div key={bonus.pieces}>
                  <p className="text-[11px] text-gold">
                    {bonus.pieces} {t("builds.pieces")}
                  </p>
                  <CheckedEffects effects={bonus.effects} why={why} locale={locale} t={t} />
                </div>
              ))}
            </div>
          ))}
          {sameSubs ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">{t("builds.subsAll")}</span>
              {subRows[0].chips.map((c, i) => (
                <Chip key={i}>{c}</Chip>
              ))}
            </div>
          ) : (
            subRows.map((r) => (
              <div key={r.slot} className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">{label("slot", r.slot, locale)}</span>
                {r.chips.map((c, i) => (
                  <Chip key={i}>{c}</Chip>
                ))}
              </div>
            ))
          )}
        </Row>
      )}

      {mem.monsterlings.length > 0 && (
        <Row title={t("builds.monsterlings")}>
          <ul className="grid gap-2 sm:grid-cols-3">
            {mem.monsterlings.map((m) => (
              <MonCard key={m.id} slot={m} locale={locale} highlight={dup.has(m.id)} why={why} t={t} />
            ))}
          </ul>
        </Row>
      )}

      {chain && (
        <Row title={t("builds.linkChain")}>
          <ChainInfo
            chain={chain}
            appears={!!c && chainAppears(chain, c, mem.cycle ?? CYCLE_SKILLS, weaknessHit, staggerOften)}
            locale={locale}
            t={t}
          />
        </Row>
      )}

      {mem.legendary && (
        <Row title={t("builds.legendary")}>
          <div className="flex flex-wrap items-center gap-2">
            <Icon src={monsterlingImage(mem.legendary.id)} />
            <span className="text-base font-semibold">{name(legendary?.name, locale, mem.legendary.id)}</span>
            <span className="text-xs text-muted">{t("builds.legendaryShared")}</span>
          </div>
          <CheckedEffects effects={legendary?.speciesEffects ?? []} why={why} locale={locale} t={t} />
          <Traits slot={mem.legendary} locale={locale} />
        </Row>
      )}
    </>
  );
}

/** ชื่อ + ธาตุ/บทบาท/ระยะ ของตัวละคร */
function charSub(c: Character | undefined, locale: Locale) {
  if (!c) return "";
  return [label("element", c.element, locale), label("role", c.role, locale), c.range && label("range", c.range, locale)]
    .filter(Boolean)
    .join(" · ");
}

/** ตัวแทนของตัวที่ replaces — ชิปรูป+ชื่อ กดแล้วกางของที่ตัวแทนใส่ · ไม่มีตัวแทนก็ไม่โชว์ส่วนนี้ */
function SubstitutesFor({ lo, replaces, locale, t }: { lo: BuildLoadout; replaces: string; locale: Locale; t: T }) {
  const subs = (lo.substitutes ?? []).filter((s) => s.replaces === replaces);
  if (subs.length === 0) return null;
  const replaced = name(characterById(replaces)?.name, locale, replaces);
  return (
    <div className="space-y-3 border-t border-line bg-surface-2/40 px-4 py-4 sm:px-5">
      <h4 className="text-sm font-semibold text-ink-2">{t("builds.subsFor").replace("{name}", replaced)}</h4>
      <div className="flex flex-wrap gap-2">
        {subs.map((sub, k) => {
          const swapped: BuildLoadout = {
            ...lo,
            members: lo.members.map((m) => (m.characterId === sub.replaces ? sub.member : m)),
          };
          const i = swapped.members.indexOf(sub.member);
          const received = receivedEffects(swapped);
          const team = swapped.members.flatMap((m) => characterById(m.characterId) ?? []);
          const others = swapped.members.filter((m) => m !== sub.member).flatMap((m) => m.monsterlings.map((x) => x.id));
          const dup = new Set(sub.member.monsterlings.map((x) => x.id).filter((id) => others.includes(id)));
          const who = characterById(sub.member.characterId);
          const img = characterImage(sub.member.characterId);
          return (
            <details key={k} className="open:basis-full">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface py-1 ps-1 pe-3 text-sm font-semibold hover:border-rail [&::-webkit-details-marker]:hidden">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
                ) : (
                  <span className="size-8 rounded-full bg-surface-2" />
                )}
                {name(who?.name, locale, sub.member.characterId)}
              </summary>
              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
                {sub.note && <p className="px-4 pt-3 text-xs text-ink-2 sm:px-5">{name(sub.note, locale, "")}</p>}
                <GearRows
                  mem={sub.member}
                  effects={received[i]?.effects ?? []}
                  team={team}
                  weaknessHit={lo.weaknessHit ?? false}
                  staggerOften={lo.staggerOften ?? false}
                  dup={dup}
                  locale={locale}
                  t={t}
                />
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

/** ของของทุกตัวในทีม (ชุดของหนึ่งชุด) — โชว์ทีละตัวตามที่เลือก · ค่าพลังรวมอยู่ด้านข้างเฉพาะตัวหลัก */
function TeamGear({
  lo,
  base,
  stats,
  pills,
  locale,
  t,
}: {
  lo: BuildLoadout;
  /** ชุดของตั้งต้นของบิ้ว — ใช้คิดตัวแทน */
  base: BuildLoadout;
  stats: ReactNode;
  pills: ReactNode[];
  locale: Locale;
  t: T;
}) {
  // มอนตัวเดียวกันบนหลายคนในทีม บัฟไม่ทับซ้อน · มอนตำนานใส่ซ้ำได้ทุกตัวละคร (ผู้เล่นบอก 2026-10-31) จึงไม่นับ
  const all = lo.members.flatMap((m) => m.monsterlings.map((x) => x.id));
  const dup = new Set(all.filter((m, i) => all.indexOf(m) !== i));
  const received = receivedEffects(lo);
  const team = lo.members.flatMap((m) => characterById(m.characterId) ?? []);
  return (
    <>
      {dup.size > 0 && <p className="mb-3 text-xs text-gold">{t("builds.dupWarning")}</p>}
      {lo.members.map((mem, i) => {
        const c = characterById(mem.characterId);
        return (
          <MemberPanel key={mem.characterId} member={i}>
            <div className="flex flex-wrap items-start gap-6">
              <section className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-2xl border border-line bg-surface">
                <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-4 sm:px-5">
                  <Icon src={characterImage(mem.characterId)} />
                  <h3 className="font-display text-lg font-semibold">
                    <Link href={`/${locale}/characters/${mem.characterId}`} className="hover:underline">
                      {name(c?.name, locale, mem.characterId)}
                    </Link>
                  </h3>
                  <span className="ms-auto text-xs text-muted">{t("builds.dimHint")}</span>
                  <div className="w-full sm:hidden">{pills[i]}</div>
                </header>
                <GearRows
                  mem={mem}
                  effects={received[i].effects}
                  team={team}
                  weaknessHit={lo.weaknessHit ?? false}
                  staggerOften={lo.staggerOften ?? false}
                  dup={dup}
                  locale={locale}
                  t={t}
                />
                <SubstitutesFor lo={base} replaces={mem.characterId} locale={locale} t={t} />
              </section>
              {i === 0 && stats && <aside className="min-w-0 flex-[1_1_320px]">{stats}</aside>}
            </div>
          </MemberPanel>
        );
      })}
    </>
  );
}

/** ทุกชุดค่าผสมของขั้นปลุกพลังรายตัว (ใช้ขั้นต่ำสุดของแต่ละช่วงเป็นตัวแทน) */
function combos(groups: [number, number][][]): number[][] {
  return groups.reduce<number[][]>((acc, g) => acc.flatMap((c) => g.map(([s]) => [...c, s])), [[]]);
}

/**
 * บิ้วหนึ่งทีม (หน้าแบบใหม่ 2026-10-31 ตาม mockup ที่ผู้เล่นตกลง)
 * หัว: ชื่อทีม + ป้ายตีจุดอ่อน + อาหาร · การ์ดตัวละคร 3 ใบ (กดเลือก + ปุ่มขั้นปลุกพลังรายตัว) · ของของตัวที่เลือก
 * ขั้นที่ให้ผลเหมือนกันรวมเป็นตัวเลือกเดียว · ของ render ครั้งเดียวต่อ "ของชุดเดียวกัน + สีเทาเหมือนกัน"
 * ค่าพลังรวม render ต่อชุดค่าผสม แล้วฝั่งเบราว์เซอร์แค่สลับว่าโชว์อันไหน
 */
function BuildView({ b, locale, t }: { b: (typeof BUILDS)[number]; locale: Locale; t: T }) {
  const first = b.loadouts[0];
  const chars = first.members.map((m) => characterById(m.characterId));
  // ตัวหลักต้องแยกขั้นที่บิ้วจัดของชุดใหม่ด้วย
  const groups = chars.map((c, i) => awakenGroups(c, i === 0 ? b.loadouts.map((x) => x.awaken) : []));
  const groupOf = (i: number, stage: number) => groups[i].find(([s, e]) => stage >= s && stage <= e)![0];
  const initial = first.members.map((m, i) => groupOf(i, m.awaken ?? first.awaken));

  const gearPanels: Record<string, ReactNode> = {};
  const gearPick: Record<string, string> = {};
  const statsByGear: Record<string, { key: string; effects: Tagged[] }[]> = {};
  // ข้อความ "ยังไม่ได้จัดของแยก" — 1 อันต่อชุดของ ซ่อน/โชว์ตามชุดค่าผสม
  const inherited = new Map<number, string[]>();
  const gearLo: Record<string, BuildLoadout> = {};

  for (const combo of combos(groups)) {
    const key = combo.join(",");
    const baseIdx = b.loadouts.reduce((best, x, i) => (x.awaken <= combo[0] ? i : best), 0);
    const base = b.loadouts[baseIdx];
    const lo: BuildLoadout = {
      ...base,
      awaken: combo[0],
      members: base.members.map((m, i) => ({ ...m, awaken: combo[i] ?? combo[0] })),
    };
    const received = receivedEffects(lo);
    // สีเทาขึ้นกับคูลดาวน์ที่ลดได้ — ปลุกพลังที่ลดคูลดาวน์จึงอาจเปลี่ยนส่วนของที่ใส่ด้วย
    const gearKey = [baseIdx, ...received.map((r) => specialCooldownReduction(r.effects))].join("|");
    gearPick[key] = gearKey;
    gearLo[gearKey] ??= lo;
    (statsByGear[gearKey] ??= []).push({ key, effects: received[0]?.effects ?? [] });
    if (base.awaken !== combo[0]) inherited.set(base.awaken, [...(inherited.get(base.awaken) ?? []), key]);
  }

  const options = groups.map((g) => g.map(([s, e]) => [s, s === e ? String(s) : `${s}–${e}`] as [number, string]));
  const pills = options.map((o, i) => <AwakenPills key={i} member={i} label={t("builds.awaken")} options={o} />);
  for (const [gearKey, lo] of Object.entries(gearLo)) {
    const main = characterById(lo.members[0].characterId);
    const stats = main && <StatsSlot char={main} combos={statsByGear[gearKey]} locale={locale} t={t} />;
    gearPanels[gearKey] = <TeamGear lo={lo} base={first} stats={stats} pills={pills} locale={locale} t={t} />;
  }

  const team = first.members.flatMap((m) => characterById(m.characterId) ?? []);
  const foodWhy: Why = (e) =>
    (e.damageType && e.damageType !== "physical" && !team.some((m) => m.element === e.damageType)) ||
    (e.condition?.teammateElement && !team.some((m) => m.element === e.condition?.teammateElement))
      ? "teamElement"
      : undefined;
  const foods = (["entree", "side"] as const).flatMap((cat) => FOOD.find((x) => x.id === first.food[cat]) ?? []);
  const mainChar = chars[0];

  return (
    <AwakenProvider initial={initial}>
      <div className="space-y-5">
        <header className="space-y-2">
          <h2 className="font-display text-3xl font-semibold">
            {t("builds.teamOf").replace("{name}", name(mainChar?.name, locale, first.members[0].characterId))}
          </h2>
          <div className="flex flex-wrap items-start gap-2">
            {first.weaknessHit && mainChar && (
              <span className="rounded-full bg-[#e3efdd] px-3 py-1 text-xs font-semibold text-[#2f5a23] dark:bg-[#22331d] dark:text-[#b7dca8]">
                {t("builds.weaknessChip").replace("{el}", label("element", mainChar.element, locale))}
              </span>
            )}
            {foods.length > 0 && (
              <details className="open:basis-full">
                <summary className="inline-flex min-h-7 cursor-pointer list-none items-center rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2 hover:border-rail [&::-webkit-details-marker]:hidden">
                  {t("builds.food")}: {foods.map((f) => name(f.name, locale, f.id)).join(" · ")}
                </summary>
                <div className="mt-2 grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
                  {foods.map((f) => (
                    <div key={f.id}>
                      <p className="text-sm font-semibold">{name(f.name, locale, f.id)}</p>
                      <CheckedEffects effects={f.effects} why={foodWhy} locale={locale} t={t} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {first.members.map((m, i) => {
            const c = chars[i];
            const img = characterImage(m.characterId);
            return (
              <MemberTab key={m.characterId} member={i} footer={<div className="hidden sm:block">{pills[i]}</div>}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" width={64} height={64} className="size-12 shrink-0 rounded-xl object-cover sm:size-16" />
                ) : (
                  <span className="size-12 shrink-0 rounded-xl bg-surface-2 sm:size-16" />
                )}
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-display text-sm font-semibold leading-tight sm:text-lg">
                    {name(c?.name, locale, m.characterId)}
                  </span>
                  <span className="hidden text-xs text-ink-2 sm:block">{charSub(c, locale)}</span>
                </span>
                {i === 0 && (
                  <span className="hidden self-start rounded-full bg-gold-bg px-2 py-0.5 text-[11px] font-semibold text-gold sm:ms-auto sm:inline">
                    {t("builds.mainBadge")}
                  </span>
                )}
              </MemberTab>
            );
          })}
        </div>

        {[...inherited].map(([n, keys]) => (
          <AwakenOnly key={n} combos={keys}>
            <p className="text-xs text-gold">{t("builds.awakenInherited").replace("{n}", String(n))}</p>
          </AwakenOnly>
        ))}
        <AwakenSwitch panels={gearPanels} pick={gearPick} />
      </div>
    </AwakenProvider>
  );
}

export default async function BuildsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold">{t("builds.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("builds.lede")}</p>

      {BUILDS.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("builds.empty")}</p>
      ) : (
        <div className="mt-8 space-y-16">
          {BUILDS.map((b) => (
            <article key={b.id} id={b.id}>
              <BuildView b={b} locale={locale as Locale} t={t} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
