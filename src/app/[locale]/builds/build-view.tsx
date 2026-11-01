import type { ReactNode } from "react";
import Link from "next/link";
import {
  AwakenPills,
  AwakenProvider,
  AwakenSwitch,
  MemberPanel,
  MemberTab,
} from "@/components/AwakenSelect";
import { EffectLine } from "@/components/EffectLine";
import type { createTranslate } from "@/i18n";
import type { Locale } from "@/lib/i18n";
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
  receivedEffects,
  specialCooldownReduction,
  unusableReason,
  type Tagged,
  type UnusableReason,
} from "@/lib/team-damage";
import { label } from "@/lib/vocabulary";
import type { BuildLoadout, BuildMember, Character, LinkChain } from "@/lib/schema/entities";
import type { Effect, LocalizedText } from "@/lib/schema/common";

export type T = ReturnType<typeof createTranslate>;

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
            // อาร์ติแฟกต์สำรอง — เรียงจากดีรองลงมา · เดิมเป็นบรรทัดชื่อเล็ก ๆ ผู้เล่นหาไม่เจอ (2026-10-31) จึงโชว์เป็นการ์ดพร้อมค่าและเอฟเฟกต์
            <details className="group border-t border-line pt-3">
              <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="inline-block transition-transform group-open:rotate-90">▸</span>
                {t("builds.artifactAlt")} ({spares.length})
              </summary>
              <ol className="mt-2 grid gap-2 lg:grid-cols-2">
                {spares.map((a) => {
                  const f = artifactFusion(a);
                  return (
                    <li key={a.id} className="space-y-1.5 rounded-xl border border-line bg-surface-2/40 p-3">
                      <div className="flex items-center gap-2.5">
                        <Icon src={a.images?.icon ? asset(`/images/artifacts/${a.images.icon}`) : null} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {name(a.name, locale, a.id)}{" "}
                            <span className="text-xs font-normal text-gold">{a.stars !== undefined && "★".repeat(a.stars)}</span>
                          </p>
                          {f?.level !== undefined && (
                            <p className="text-[11px] text-gold">
                              {t("builds.fusion")} {f.level}
                              {f.name && ` · ${name(f.name, locale, "")}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {a.stats.map((st, j) => (
                          <Chip key={j}>
                            {statName(st.stat, st.damageType, locale)} +{st.value.toLocaleString("en-US")}
                            {st.unit === "percent" ? "%" : ""}
                          </Chip>
                        ))}
                      </div>
                      <CheckedEffects effects={f?.effects ?? []} why={why} locale={locale} t={t} />
                    </li>
                  );
                })}
              </ol>
            </details>
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

/** มอนซ้ำในทีม — มอนตัวเดียวกันบนหลายคนบัฟไม่ทับซ้อน · มอนตำนานใส่ซ้ำได้ทุกตัวละคร (ผู้เล่นบอก 2026-10-31) จึงไม่นับ */
function dupMonsters(lo: BuildLoadout): Set<string> {
  const all = lo.members.flatMap((m) => m.monsterlings.map((x) => x.id));
  return new Set(all.filter((m, i) => all.indexOf(m) !== i));
}

/**
 * ของของตัวละครหนึ่งตัวในชุดของหนึ่งชุด — render ครั้งเดียวต่อ "ของชุดเดียวกัน + สีเทาเหมือนกัน" ของตัวนั้น
 * (เดิม render ของทั้งทีมต่อชุดของ พอมีของแยกตามขั้นปลุกพลัง หน้าใหญ่เกิน 2 MB)
 */
function MemberGear({ lo, i, effects, locale, t }: { lo: BuildLoadout; i: number; effects: Tagged[]; locale: Locale; t: T }) {
  const team = lo.members.flatMap((m) => characterById(m.characterId) ?? []);
  return (
    <GearRows
      mem={lo.members[i]}
      effects={effects}
      team={team}
      weaknessHit={lo.weaknessHit ?? false}
      staggerOften={lo.staggerOften ?? false}
      dup={dupMonsters(lo)}
      locale={locale}
      t={t}
    />
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
 */
export function BuildView({ b, locale, t }: { b: (typeof BUILDS)[number]; locale: Locale; t: T }) {
  const first = b.loadouts[0];
  const chars = first.members.map((m) => characterById(m.characterId));
  // ปุ่มปลุกพลังมีแค่ของตัวหลัก แบ่งตามชุดของ — ขั้นที่ใส่ของ/มอนชุดเดียวกันรวมเป็นปุ่มเดียว (ผู้เล่นสั่ง 2026-11-01)
  // เช่น Gabi 0–3 · 4–5 · 6 · ทั้งทีมถือว่าอยู่ขั้นเดียวกับตัวหลัก (ของแต่ละชุดจัดแบบนั้น) · ไม่โชว์ค่าพลังรวมแล้ว
  const starts = [...new Set(b.loadouts.map((x) => x.awaken))].sort((x, y) => x - y);
  const mainRanges: [number, number][] = starts.map((s, k) => [s, (starts[k + 1] ?? 7) - 1]);
  const groups: [number, number][][] = chars.map((_, i) => (i === 0 ? mainRanges : [[0, 6]]));
  const groupOf = (i: number, stage: number) => groups[i].find(([s, e]) => stage >= s && stage <= e)![0];
  const initial = first.members.map((m, i) => groupOf(i, m.awaken ?? first.awaken));

  // ของรายตัว: คีย์ = ของที่ใส่ + คูลดาวน์ที่ลดได้ (สีเทา) + มอนซ้ำในทีม + เงื่อนไขทีม
  const memberPick: Record<string, string>[] = first.members.map(() => ({}));
  const memberPanels: Record<string, ReactNode>[] = first.members.map(() => ({}));
  const dupPick: Record<string, string> = {};
  const memberIds: Map<string, string>[] = first.members.map(() => new Map());

  for (const combo of combos(groups)) {
    const key = combo.join(",");
    const baseIdx = b.loadouts.reduce((best, x, i) => (x.awaken <= combo[0] ? i : best), 0);
    const base = b.loadouts[baseIdx];
    const lo: BuildLoadout = {
      ...base,
      awaken: combo[0],
      members: base.members.map((m) => ({ ...m, awaken: combo[0] })),
    };
    // สีเทาขึ้นกับคูลดาวน์ที่ลดได้ — ปลุกพลังที่ลดคูลดาวน์จึงอาจเปลี่ยนส่วนของที่ใส่ด้วย
    const received = receivedEffects(lo);
    const dup = dupMonsters(lo);
    dupPick[key] = dup.size > 0 ? "dup" : "none";
    lo.members.forEach((m, i) => {
      const { awaken: _a, ...gear } = m;
      void _a;
      const sig = JSON.stringify([gear, specialCooldownReduction(received[i].effects), [...dup], lo.weaknessHit, lo.staggerOften]);
      // คีย์สั้น — คีย์ส่งไปเบราว์เซอร์ทุกชุดค่าผสม ถ้าใช้ JSON ยาว ๆ หน้าบวมเป็น MB
      if (!memberIds[i].has(sig)) memberIds[i].set(sig, String(memberIds[i].size));
      const mk = memberIds[i].get(sig)!;
      memberPick[i][key] = mk;
      memberPanels[i][mk] ??= <MemberGear lo={lo} i={i} effects={received[i].effects} locale={locale} t={t} />;
    });
  }

  const options = groups.map((g) => g.map(([s, e]) => [s, s === e ? String(s) : `${s}–${e}`] as [number, string]));
  const pills = options.map((o, i) => (i === 0 && o.length > 1 ? <AwakenPills key={i} member={i} label={t("builds.awaken")} options={o} /> : null));

  const team = first.members.flatMap((m) => characterById(m.characterId) ?? []);
  const foodWhy: Why = (e) =>
    (e.damageType && e.damageType !== "physical" && !team.some((m) => m.element === e.damageType)) ||
    (e.condition?.teammateElement && !team.some((m) => m.element === e.condition?.teammateElement))
      ? "teamElement"
      : undefined;
  // ไม่โชว์ชื่ออาหาร บอกแค่ประเภท (จานหลัก/จานรอง) + บัฟ — เมนูที่ค่าเท่ากันมีหลายอย่าง ใช้อันไหนก็ได้ (ผู้เล่นสั่ง 2026-10-31)
  const foods = (["entree", "side"] as const).flatMap((cat) => {
    const f = FOOD.find((x) => x.id === first.food[cat]);
    return f ? [{ cat, effects: f.effects }] : [];
  });
  const mainChar = chars[0];

  return (
    <AwakenProvider initial={initial}>
      <div className="space-y-5">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-semibold">
            {t("builds.teamOf").replace("{name}", name(mainChar?.name, locale, first.members[0].characterId))}
          </h1>
          <div className="flex flex-wrap items-start gap-2">
            {first.weaknessHit && mainChar && (
              <span className="rounded-full bg-[#e3efdd] px-3 py-1 text-xs font-semibold text-[#2f5a23] dark:bg-[#22331d] dark:text-[#b7dca8]">
                {t("builds.weaknessChip").replace("{el}", label("element", mainChar.element, locale))}
              </span>
            )}
            {foods.length > 0 && (
              <details className="open:basis-full">
                <summary className="inline-flex min-h-7 cursor-pointer list-none items-center rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2 hover:border-rail [&::-webkit-details-marker]:hidden">
                  {t("builds.food")}: {foods.map((f) => label("foodCategory", f.cat, locale)).join(" · ")}
                </summary>
                <div className="mt-2 grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
                  {foods.map((f) => (
                    <div key={f.cat}>
                      <p className="text-sm font-semibold">{label("foodCategory", f.cat, locale)}</p>
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
              <MemberTab key={m.characterId} member={i} footer={pills[i] ? <div className="hidden sm:block">{pills[i]}</div> : undefined}>
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

        <AwakenSwitch panels={{ dup: <p className="text-xs text-gold">{t("builds.dupWarning")}</p>, none: null }} pick={dupPick} />
        {first.members.map((mem, i) => {
          const c = chars[i];
          const subs = (first.substitutes ?? []).some((x) => x.replaces === mem.characterId);
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
                    {pills[i] && <div className="w-full sm:hidden">{pills[i]}</div>}
                  </header>
                  <AwakenSwitch panels={memberPanels[i]} pick={memberPick[i]} />
                  {/* ตัวแทนคิดจากของชุดแรกของบิ้ว — render ครั้งเดียว */}
                  {subs && <SubstitutesFor lo={first} replaces={mem.characterId} locale={locale} t={t} />}
                </section>
              </div>
            </MemberPanel>
          );
        })}
      </div>
    </AwakenProvider>
  );
}
