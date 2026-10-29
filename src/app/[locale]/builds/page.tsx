import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuildTabs } from "@/components/BuildTabs";
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
import { artifactFusion, receivedEffects, statSheet, unusableReason, type StatSheet, type Tagged } from "@/lib/team-damage";
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

/** มอนของตัวเอง — เอฟเฟกต์สายพันธุ์ + Trait 4 ช่อง */
function MonFull({
  slot,
  locale,
  highlight,
  traitsLabel,
}: {
  slot: MonSlot;
  locale: Locale;
  highlight: boolean;
  traitsLabel: string;
}) {
  const m = MONSTERLINGS.get(slot.id);
  return (
    <li className={`rounded-md p-1.5 ${highlight ? "ring-1 ring-gold" : ""}`}>
      <div className="flex items-center gap-2">
        <Icon src={monsterlingImage(slot.id)} />
        <span className="text-sm font-semibold">{name(m?.name, locale, slot.id)}</span>
      </div>
      <Effects effects={m?.speciesEffects ?? []} locale={locale} />
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
function ChainInfo({ chain, locale, t }: { chain: LinkChain; locale: Locale; t: T }) {
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

const pctFmt = (v: number) => `${Math.round(v * 100) / 100}%`;
const numFmt = (v: number) => Math.round(v).toLocaleString("en-US");

/** ค่าพลังรวม — ของที่ใส่อย่างเดียว เทียบกับรวมบัฟทั้งหมด + รายการบัฟแยกตามที่มา */
function StatsSlot({ char, effects, locale, t }: { char: Character; effects: Tagged[]; locale: Locale; t: T }) {
  const gear = statSheet(char, effects, true);
  const all = statSheet(char, effects, false);
  const roleStat = { fighter: "brawlDmg", assassin: "suppressionDmg", destroyer: "neutralizationDmg", supporter: "supportDmg" }[
    char.role as string
  ];
  const rows: { label: string; key: keyof StatSheet; fmt: (v: number) => string }[] = [
    { label: label("stat", "atk", locale), key: "atk", fmt: numFmt },
    { label: label("stat", "def", locale), key: "def", fmt: numFmt },
    { label: label("stat", "hp", locale), key: "hp", fmt: numFmt },
    { label: label("stat", "critRate", locale), key: "critRate", fmt: pctFmt },
    { label: label("stat", "critDmg", locale), key: "critDmg", fmt: pctFmt },
    {
      label:
        locale === "en"
          ? `${label("element", char.element, locale)} ${t("builds.stats.element")}`
          : `${t("builds.stats.element")}${label("element", char.element, locale)}`,
      key: "elementDmg", fmt: pctFmt },
    { label: t("builds.stats.basic"), key: "basicAttackDmg", fmt: pctFmt },
    { label: t("builds.stats.skill"), key: "skillDmg", fmt: pctFmt },
    { label: t("builds.stats.boss"), key: "bossDmg", fmt: pctFmt },
    { label: t("builds.stats.weakness"), key: "weaknessDmg", fmt: pctFmt },
    { label: t("builds.stats.dmgBonus"), key: "dmgBonus", fmt: pctFmt },
    { label: t("builds.stats.mastery"), key: "roleMastery", fmt: numFmt },
    ...(roleStat ? [{ label: label("stat", roleStat, locale), key: "roleDmg" as const, fmt: pctFmt }] : []),
    { label: t("builds.stats.enemyDef"), key: "enemyDefDown", fmt: pctFmt },
    { label: t("builds.stats.enemyRes"), key: "enemyResDown", fmt: pctFmt },
  ];

  // บัฟ (ไม่ใช่ค่าพลังของของ) จัดกลุ่มตามที่มา
  const groups = new Map<string, { from: LocalizedText; effects: Effect[] }>();
  for (const x of effects) {
    if (x.gear) continue;
    const k = `${x.from.th ?? ""}|${x.from.en ?? ""}`;
    if (!groups.has(k)) groups.set(k, { from: x.from, effects: [] });
    groups.get(k)!.effects.push(x.effect);
  }

  return (
    <Slot title={t("builds.stats")}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-muted">
            <th className="py-1 text-start font-normal"></th>
            <th className="py-1 text-end font-normal">{t("builds.stats.gear")}</th>
            <th className="py-1 text-end font-normal">{t("builds.stats.buffed")}</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => gear[r.key] !== 0 || all[r.key] !== 0)
            .map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="py-1 text-xs text-ink-2">{r.label}</td>
                <td className="py-1 text-end font-mono">{r.fmt(gear[r.key])}</td>
                <td className="py-1 text-end font-mono text-gold">{r.fmt(all[r.key])}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted">{t("builds.stats.note")}</p>
      {groups.size > 0 && (
        <details className="mt-3 border-t border-line pt-2">
          <summary className="cursor-pointer text-xs font-semibold text-ink-2">
            {t("builds.buffs")} ({groups.size})
          </summary>
          <ul className="mt-2 space-y-3">
            {[...groups.values()].map((g, i) => (
              <li key={i}>
                <p className="text-xs font-semibold">{name(g.from, locale, "")}</p>
                <Effects effects={g.effects} locale={locale} />
              </li>
            ))}
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
  dup,
  locale,
  t,
}: {
  mem: BuildMember;
  effects: Tagged[];
  dup: Set<string>;
  locale: Locale;
  t: T;
}) {
  const c = characterById(mem.characterId);
  const arts = (mem.artifacts ?? []).flatMap((id) => ARTIFACTS.find((a) => a.id === id) ?? []);
  const chain = LINK_CHAINS.find((x) => x.id === mem.linkChain);
  const sets = activeSets(mem);
  const img = characterImage(mem.characterId);

  return (
    <section className="rounded-xl border border-line p-3">
      <header className="mb-3 flex items-center gap-2.5">
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
                    {(fusion?.effects ?? []).map((e, j) => {
                      const why = c && unusableReason(c, e);
                      return why ? (
                        <div key={j} className="opacity-50">
                          <Effects effects={[e]} locale={locale} />
                          <p className="mt-1 text-[11px] text-gold">{t(`builds.unusable.${why}`)}</p>
                        </div>
                      ) : (
                        <Effects key={j} effects={[e]} locale={locale} />
                      );
                    })}
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
                  <Effects effects={bonus.effects} locale={locale} />
                </div>
              ))}
            </div>
          ))}
        </Slot>

        <Slot title={t("builds.monsterlings")}>
          <ul className="space-y-2">
            {mem.monsterlings.map((m) => (
              <MonFull key={m.id} slot={m} locale={locale} highlight={dup.has(m.id)} traitsLabel={t("builds.traits")} />
            ))}
          </ul>
        </Slot>

        <div className="space-y-3">
          <Slot title={t("builds.linkChain")}>
            {chain ? (
              <ChainInfo chain={chain} locale={locale} t={t} />
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
                  traitsLabel={t("builds.traits")}
                />
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("builds.empty.slot")}</p>
            )}
          </Slot>
        </div>
        {c && (
          <div className="sm:col-span-2">
            <StatsSlot char={c} effects={effects} locale={locale} t={t} />
          </div>
        )}
      </div>
    </section>
  );
}

function Loadout({ lo, locale, t }: { lo: BuildLoadout; locale: Locale; t: T }) {
  // มอนตัวเดียวกันบนหลายคนในทีม บัฟไม่ทับซ้อน
  const all = lo.members.flatMap((m) => [...m.monsterlings.map((x) => x.id), ...(m.legendary ? [m.legendary.id] : [])]);
  const dup = new Set(all.filter((m, i) => all.indexOf(m) !== i));
  const received = receivedEffects(lo);

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
                <Effects effects={f?.effects ?? []} locale={locale} />
              </div>
            );
          })}
        </div>
      </Slot>
      {dup.size > 0 && <p className="text-xs text-gold">{t("builds.dupWarning")}</p>}
      {lo.members.map((mem, i) => (
        <MemberGear key={mem.characterId} mem={mem} effects={received[i].effects} dup={dup} locale={locale} t={t} />
      ))}
    </div>
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
                <BuildTabs
                  labels={b.loadouts.map((lo) => `${t("builds.awaken")} ${lo.awaken}`)}
                  panels={b.loadouts.map((lo) => (
                    <Loadout key={lo.awaken} lo={lo} locale={locale as Locale} t={t} />
                  ))}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
