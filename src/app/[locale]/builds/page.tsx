import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AwakenOnly,
  AwakenProvider,
  AwakenStatsTable,
  AwakenSwitch,
  AwakenText,
  MemberAwakenSelect,
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
  teamDamage,
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

/** เหมือน Effects แต่เอฟเฟกต์ที่ใช้ไม่ได้เป็นสีจางพร้อมเหตุผล */
function CheckedEffects({ effects, why, locale, t }: { effects: Effect[]; why?: Why; locale: Locale; t: T }) {
  return (
    <>
      {effects.map((e, j) => {
        const reason = why?.(e);
        return reason ? (
          <div key={j} className="opacity-50">
            <Effects effects={[e]} locale={locale} />
            <p className="mt-1 text-[11px] text-gold">{t(`builds.unusable.${reason}`)}</p>
          </div>
        ) : (
          <Effects key={j} effects={[e]} locale={locale} />
        );
      })}
    </>
  );
}

/** มอนของตัวเอง — เอฟเฟกต์สายพันธุ์ + Trait 4 ช่อง */
function MonFull({
  slot,
  locale,
  highlight,
  why,
  t,
}: {
  slot: MonSlot;
  locale: Locale;
  highlight: boolean;
  why?: Why;
  t: T;
}) {
  const traitsLabel = t("builds.traits");
  const m = MONSTERLINGS.get(slot.id);
  return (
    <li className={`rounded-md p-1.5 ${highlight ? "ring-1 ring-gold" : ""}`}>
      <div className="flex items-center gap-2">
        <Icon src={monsterlingImage(slot.id)} />
        <span className="text-sm font-semibold">{name(m?.name, locale, slot.id)}</span>
      </div>
      <CheckedEffects effects={m?.speciesEffects ?? []} why={why} locale={locale} t={t} />
      {slot.traits.length > 0 && (
        <ul className="mt-2 flex flex-wrap items-center gap-1">
          <li className="text-[11px] text-muted">{traitsLabel}:</li>
          {slot.traits.map((tr, i) => {
            const trait = TRAIT_POOL.pool.find((x) => x.id === tr.id);
            const value = trait ? trait.values[tr.grade as keyof typeof trait.values] : undefined;
            return (
              <li key={i} className="rounded border border-gold/60 px-1.5 py-0.5 text-[11px] text-ink">
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
      )}
    </li>
  );
}

/** ลิงก์เชน — มอนเจ้าของ เงื่อนไขปรากฏตัว ดาเมจ คูลดาวน์ และเอฟเฟกต์เพิ่มเติมของขั้นสูงสุดที่อ่านมา */
function ChainInfo({ chain, appears, locale, t }: { chain: LinkChain; appears: boolean; locale: Locale; t: T }) {
  const owner = MONSTERLINGS.get(chain.monsterlingId);
  const top = [...chain.levels].sort((a, b) => b.level - a.level)[0];
  return (
    <div className="text-sm">
      <p className="font-semibold">
        {name(chain.name, locale, chain.id)}
        {chain.rarity !== undefined && <span className="ms-1.5 text-xs text-gold">{"◆".repeat(chain.rarity)}</span>}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-2">
        <Icon src={monsterlingImage(chain.monsterlingId)} />
        <span>
          {t("linkChains.owner")}: {name(owner?.name, locale, chain.monsterlingId)}
        </span>
      </div>
      {top && (
        <dl className="mt-2 space-y-0.5 text-xs">
          <div className="flex gap-1.5">
            <dt className="text-muted">{t("linkChains.level")}</dt>
            <dd>{top.level}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted">{t("linkChains.condition")}:</dt>
            <dd>{top.appearanceConditions.map((c) => label("appearanceCondition", c, locale)).join(" / ")}</dd>
          </div>
          {top.appearanceInfo.dmgPercentOfAtk !== undefined && (
            <div className="flex gap-1.5">
              <dt className="text-muted">{t("linkChains.dmgOfAtk")}:</dt>
              <dd className="font-mono">{top.appearanceInfo.dmgPercentOfAtk}%</dd>
            </div>
          )}
          {top.appearanceInfo.cooldownSec !== undefined && (
            <div className="flex gap-1.5">
              <dt className="text-muted">{t("linkChains.cooldown")}:</dt>
              <dd className="font-mono">{top.appearanceInfo.cooldownSec}s</dd>
            </div>
          )}
          {top.bonusEffects?.map((bonus, i) => (
            <div key={i} className="flex gap-1.5">
              <dt className="text-muted">{t("linkChains.bonus")}:</dt>
              <dd>{name(bonus, locale, "")}</dd>
            </div>
          ))}
        </dl>
      )}
      {!appears && <p className="mt-2 text-[11px] text-gold">{t("builds.chainNoAppear")}</p>}
    </div>
  );
}

function Slot({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</h3>
      <div className="mt-2">{children}</div>
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

/** ของที่ตัวละคร 1 ตัวในทีมใส่ */
function MemberGear({
  mem,
  effects,
  team,
  weaknessHit,
  staggerOften,
  stats,
  awakenSelect,
  dup,
  locale,
  t,
}: {
  mem: BuildMember;
  effects: Tagged[];
  team: Character[];
  weaknessHit: boolean;
  staggerOften: boolean;
  /** ค่าพลังรวม — โชว์เฉพาะตัวหลัก (ตัวแรก) · ผู้เล่นสั่ง 2026-10-31 */
  stats?: ReactNode;
  /** dropdown ขั้นปลุกพลังของตัวนี้ */
  awakenSelect?: ReactNode;
  dup: Set<string>;
  locale: Locale;
  t: T;
}) {
  const c = characterById(mem.characterId);
  const cdCut = specialCooldownReduction(effects);
  const why: Why | undefined = c && ((e) => unusableReason(c, e, cdCut, team));
  const arts = (mem.artifacts ?? []).flatMap((id) => ARTIFACTS.find((a) => a.id === id) ?? []);
  const chain = LINK_CHAINS.find((x) => x.id === mem.linkChain);
  const sets = activeSets(mem);
  const img = characterImage(mem.characterId);

  return (
    <section className="rounded-xl border border-line p-3">
      <header className="mb-3 flex flex-wrap items-center gap-2.5">
        <Icon src={img} />
        <div>
          <h3 className="text-sm font-semibold">
            <Link href={`/${locale}/characters/${mem.characterId}`} className="hover:underline">
              {name(c?.name, locale, mem.characterId)}
            </Link>
          </h3>
          {c && (
            <p className="text-[11px] text-ink-2">
              <span className="text-gold">{c.rarity !== undefined && "★".repeat(c.rarity)}</span>{" "}
              {label("role", c.role, locale)} · {label("element", c.element, locale)}
            </p>
          )}
        </div>
        {awakenSelect}
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slot title={t("builds.artifact")}>
          {arts.length === 0 ? (
            <p className="text-sm text-muted">{t("builds.empty.slot")}</p>
          ) : (
            <ol className="space-y-3">
              {arts.map((art, i) => {
                const fusion = artifactFusion(art);
                return (
                  <li key={art.id} className={i > 0 ? "border-t border-line pt-3" : undefined}>
                    <p className="mb-1 text-[11px] text-muted">
                      {i === 0 ? t("builds.artifactMain") : `${t("builds.artifactAlt")} ${i}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Icon src={art.images?.icon ? asset(`/images/artifacts/${art.images.icon}`) : null} />
                      <div>
                        <p className="text-sm font-semibold">
                          {name(art.name, locale, art.id)}{" "}
                          <span className="text-xs font-normal text-gold">
                            {art.stars !== undefined && "★".repeat(art.stars)}
                          </span>
                        </p>
                        <p className="text-xs text-gold">
                          {fusion?.level !== undefined && `${t("builds.fusion")} ${fusion.level}`}
                          {fusion?.name && ` · ${name(fusion.name, locale, "")}`}
                        </p>
                      </div>
                    </div>
                    <p className="mt-1.5 flex flex-wrap gap-1">
                      {art.stats.map((st, j) => (
                        <span key={j} className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-2">
                          {st.damageType
                            ? locale === "en"
                              ? `${label("damageType", st.damageType, locale)} ${label("stat", st.stat, locale)}`
                              : `${label("stat", st.stat, locale)}ธาตุ${label("damageType", st.damageType, locale)}`
                            : label("stat", st.stat, locale)}
                          <span className="font-mono text-gold">
                            {" "}+{st.value.toLocaleString("en-US")}
                            {st.unit === "percent" ? "%" : ""}
                          </span>
                        </span>
                      ))}
                    </p>
                    <CheckedEffects effects={fusion?.effects ?? []} why={why} locale={locale} t={t} />
                  </li>
                );
              })}
            </ol>
          )}
        </Slot>

        <Slot title={t("builds.equipment")}>
          <ul className="space-y-1 text-sm">
            {SLOTS.map((slot) => {
              const piece = EQUIPMENT.find((e) => e.id === mem.equipment[slot]);
              const subs = piece ? (mem.substats[slot] ?? []) : [];
              return (
                <li key={slot} className="flex gap-2">
                  <span className="w-20 shrink-0 text-xs text-muted">{label("slot", slot, locale)}</span>
                  <span>
                    {piece ? name(piece.name, locale, piece.id) : t("builds.empty.slot")}
                    {subs.length > 0 && (
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {subs.map((key, i) => {
                          const sub = minSubstat(key, piece!.grade, piece!.stars);
                          const statName = sub?.damageType
                            ? `${label("stat", sub.stat, locale)} ${label("damageType", sub.damageType, locale)}`
                            : label("stat", sub?.stat ?? key, locale);
                          return (
                            <span key={i} className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-2">
                              {statName}
                              {sub && (
                                <span className="font-mono text-gold">
                                  {" "}+{sub.min}
                                  {sub.unit === "percent" ? "%" : ""}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {sets.map(({ set, n, bonuses }) => (
            <div key={set.id} className="mt-3 border-t border-line pt-2">
              <p className="text-xs font-semibold text-ink-2">
                {name(set.name, locale, set.id)}{" "}
                <span className="font-normal text-muted">
                  ({n}
                  {set.pieceCount ? `/${set.pieceCount}` : ""})
                </span>
              </p>
              {bonuses.map((bonus) => (
                <div key={bonus.pieces} className="mt-1.5">
                  <p className="text-[11px] text-gold">
                    {bonus.pieces} {t("builds.pieces")}
                  </p>
                  <CheckedEffects effects={bonus.effects} why={why} locale={locale} t={t} />
                </div>
              ))}
            </div>
          ))}
        </Slot>

        <Slot title={t("builds.monsterlings")}>
          <ul className="space-y-2">
            {mem.monsterlings.map((m) => (
              <MonFull key={m.id} slot={m} locale={locale} highlight={dup.has(m.id)} why={why} t={t} />
            ))}
          </ul>
        </Slot>

        <div className="space-y-3">
          <Slot title={t("builds.linkChain")}>
            {chain ? (
              <ChainInfo
                chain={chain}
                appears={!!c && chainAppears(chain, c, mem.cycle ?? CYCLE_SKILLS, weaknessHit, staggerOften)}
                locale={locale}
                t={t}
              />
            ) : (
              <p className="text-sm text-muted">{t("builds.empty.slot")}</p>
            )}
          </Slot>
          <Slot title={t("builds.legendary")}>
            {mem.legendary ? (
              <ul>
                <MonFull
                  slot={mem.legendary}
                  locale={locale}
                  highlight={dup.has(mem.legendary.id)}
                  why={why}
                  t={t}
                />
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("builds.empty.slot")}</p>
            )}
          </Slot>
        </div>
        {stats && <div className="sm:col-span-2">{stats}</div>}
      </div>
    </section>
  );
}

function Loadout({
  lo,
  stats,
  selects,
  locale,
  t,
}: {
  lo: BuildLoadout;
  stats: ReactNode;
  selects: ReactNode[];
  locale: Locale;
  t: T;
}) {
  // มอนตัวเดียวกันบนหลายคนในทีม บัฟไม่ทับซ้อน
  // มอนตำนานใส่ซ้ำได้ทุกตัวละคร (ผู้เล่นบอก 2026-10-31) จึงไม่นับ
  const all = lo.members.flatMap((m) => m.monsterlings.map((x) => x.id));
  const dup = new Set(all.filter((m, i) => all.indexOf(m) !== i));
  const received = receivedEffects(lo);
  const team = lo.members.flatMap((m) => characterById(m.characterId) ?? []);
  const foodWhy: Why = (e) =>
    (e.damageType && e.damageType !== "physical" && !team.some((m) => m.element === e.damageType)) ||
    (e.condition?.teammateElement && !team.some((m) => m.element === e.condition?.teammateElement))
      ? "teamElement"
      : undefined;

  return (
    <div className="space-y-3">
      <Slot title={t("builds.food")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["entree", "side"] as const).map((cat) => {
            const f = FOOD.find((x) => x.id === lo.food[cat]);
            return (
              <div key={cat}>
                <p className="text-sm">
                  <span className="text-xs text-muted">{label("foodCategory", cat, locale)}: </span>
                  {f ? name(f.name, locale, f.id) : t("builds.empty.slot")}
                </p>
                <CheckedEffects effects={f?.effects ?? []} why={foodWhy} locale={locale} t={t} />
              </div>
            );
          })}
        </div>
      </Slot>
      {lo.weaknessHit && <p className="text-xs text-ink-2">{t("builds.weaknessHit")}</p>}
      {dup.size > 0 && <p className="text-xs text-gold">{t("builds.dupWarning")}</p>}
      {lo.members.map((mem, i) => (
        <MemberGear
          key={mem.characterId}
          mem={mem}
          effects={received[i].effects}
          team={team}
          weaknessHit={lo.weaknessHit ?? false}
          staggerOften={lo.staggerOften ?? false}
          stats={i === 0 ? stats : undefined}
          awakenSelect={selects[i]}
          dup={dup}
          locale={locale}
          t={t}
        />
      ))}
    </div>
  );
}

/** ทุกชุดค่าผสมของขั้นปลุกพลังรายตัว (ใช้ขั้นต่ำสุดของแต่ละช่วงเป็นตัวแทน) */
function combos(groups: [number, number][][]): number[][] {
  return groups.reduce<number[][]>((acc, g) => acc.flatMap((c) => g.map(([s]) => [...c, s])), [[]]);
}

/**
 * บิ้วหนึ่งทีม — dropdown ขั้นปลุกพลังแยกรายตัว (ผู้เล่นสั่ง 2026-10-31)
 * ขั้นที่ให้ผลเหมือนกันรวมเป็นตัวเลือกเดียว · ส่วนของที่ใส่ render ครั้งเดียวต่อ "ของชุดเดียวกัน + สีเทาเหมือนกัน"
 * ส่วนค่าพลังรวม render ต่อชุดค่าผสม แล้วฝั่งเบราว์เซอร์แค่สลับว่าโชว์อันไหน
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

  const selects = groups.map((g, i) => (
    <MemberAwakenSelect
      key={i}
      member={i}
      label={t("builds.awaken")}
      options={g.map(([s, e]) => [s, s === e ? String(s) : `${s}–${e}`])}
    />
  ));
  for (const [gearKey, lo] of Object.entries(gearLo)) {
    const main = characterById(lo.members[0].characterId);
    const stats = main && <StatsSlot char={main} combos={statsByGear[gearKey]} locale={locale} t={t} />;
    gearPanels[gearKey] = <Loadout lo={lo} stats={stats} selects={selects} locale={locale} t={t} />;
  }

  return (
    <AwakenProvider initial={initial}>
      <div className="space-y-3">
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

/**
 * ตัวแทน — ถ้าไม่มีตัวใดตัวหนึ่งในทีม (ผู้เล่นสั่ง 2026-10-31)
 * คิดที่ขั้นปลุกพลังเริ่มต้นของบิ้ว ไม่ตาม dropdown · ดาเมจรวมทีมเทียบทีมหลัก
 */
function Substitutes({ lo, locale, t }: { lo: BuildLoadout; locale: Locale; t: T }) {
  const subs = lo.substitutes ?? [];
  if (subs.length === 0) return null;
  const main = teamDamage(lo).total;
  return (
    <section className="mt-6 border-t border-line pt-4">
      <h3 className="font-display text-base font-semibold">{t("builds.substitutes")}</h3>
      <p className="mt-1 text-xs text-ink-2">{t("builds.substitutesNote")}</p>
      <div className="mt-3 space-y-2">
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
          const pct = teamDamage(swapped).total / main - 1;
          const pctText = `${pct >= 0 ? "+" : "−"}${Math.abs(Math.round(pct * 1000) / 10)}%`;
          const replaced = name(characterById(sub.replaces)?.name, locale, sub.replaces);
          const who = name(characterById(sub.member.characterId)?.name, locale, sub.member.characterId);
          return (
            <details key={k} className="rounded-xl border border-line p-3">
              <summary className="cursor-pointer text-sm">
                <span className="text-muted">{t("builds.replaces").replace("{name}", replaced)}:</span>{" "}
                <strong className="font-semibold">{who}</strong>{" "}
                <span className="text-xs text-gold">{t("builds.teamDmgVsMain").replace("{pct}", pctText)}</span>
              </summary>
              {sub.note && <p className="mt-2 text-xs text-ink-2">{name(sub.note, locale, "")}</p>}
              <div className="mt-3">
                <MemberGear
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
    </section>
  );
}

export default async function BuildsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("builds.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("builds.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">{BUILDS.length}</strong> {t("builds.count")}
      </p>

      {BUILDS.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("builds.empty")}</p>
      ) : (
        <div className="mt-6 space-y-8">
          {BUILDS.map((b) => {
            const team = b.loadouts[0].members.map((m) => name(characterById(m.characterId)?.name, locale as Locale, m.characterId));
            return (
              <article key={b.id} id={b.id} className="rounded-xl border border-line p-4">
                <h2 className="mb-4 font-display text-lg font-semibold">{team.join(" · ")}</h2>
                <p className="mb-3 text-xs text-ink-2">{t("builds.awakenSelect")}</p>
                <BuildView b={b} locale={locale as Locale} t={t} />
                <Substitutes lo={b.loadouts[0]} locale={locale as Locale} t={t} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
