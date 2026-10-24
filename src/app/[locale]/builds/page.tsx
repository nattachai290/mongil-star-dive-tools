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
  monsterlingImage,
} from "@/lib/data";
import { asset } from "@/lib/base-path";
import { label } from "@/lib/vocabulary";
import type { Build, BuildLoadout } from "@/lib/schema/entities";
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

type MonSlot = BuildLoadout["monsterlings"][number];

/** ชิ้นต่อเซ็ตของแท็บนี้ → โบนัสที่ทำงาน (ครบ 2 / 4 ชิ้น) */
function activeSets(lo: BuildLoadout) {
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
            const trait = TRAIT_POOL.pool.find((x) => x.id === tr);
            return (
              <li key={i} className="rounded border border-gold/60 px-1.5 py-0.5 text-[11px] text-ink">
                {name(trait?.name, locale, tr)}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function MonSmall({ id, locale, highlight }: { id: string; locale: Locale; highlight: boolean }) {
  const m = MONSTERLINGS.get(id);
  return (
    <li className={`flex items-center gap-2 rounded-md p-1 ${highlight ? "ring-1 ring-gold" : ""}`}>
      <Icon src={monsterlingImage(id)} />
      <span className="text-sm">{name(m?.name, locale, id)}</span>
    </li>
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

function Loadout({ b, lo, locale, t }: { b: Build; lo: BuildLoadout; locale: Locale; t: T }) {
  const art = ARTIFACTS.find((a) => a.id === lo.artifact);
  const fusion = art && [...art.fusion].sort((x, y) => y.artifactLevel - x.artifactLevel)[0];
  const chain = LINK_CHAINS.find((c) => c.id === lo.linkChain);
  const legendary = lo.legendary ? MONSTERLINGS.get(lo.legendary) : undefined;
  const sets = activeSets(lo);

  // มอนตัวเดียวกันบนหลายคนในทีม บัฟไม่ทับซ้อน
  const own = lo.monsterlings.map((m) => m.id);
  const all = [...own, ...lo.teammates.flatMap((m) => m.monsterlings)];
  const dup = new Set(all.filter((m, i) => all.indexOf(m) !== i));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Slot title={t("builds.artifact")}>
          {art ? (
            <>
              <div className="flex items-center gap-2">
                <Icon src={art.images?.icon ? asset(`/images/artifacts/${art.images.icon}`) : null} />
                <div>
                  <p className="text-sm font-semibold">{name(art.name, locale, art.id)}</p>
                  {fusion?.name && <p className="text-xs text-gold">{name(fusion.name, locale, "")}</p>}
                </div>
              </div>
              <Effects effects={fusion?.effects ?? []} locale={locale} />
            </>
          ) : (
            <p className="text-sm text-muted">{t("builds.empty.slot")}</p>
          )}
        </Slot>

        <Slot title={t("builds.equipment")}>
          <ul className="space-y-1 text-sm">
            {SLOTS.map((slot) => {
              const piece = EQUIPMENT.find((e) => e.id === lo.equipment[slot]);
              return (
                <li key={slot} className="flex gap-2">
                  <span className="w-20 shrink-0 text-xs text-muted">{label("slot", slot, locale)}</span>
                  <span>{piece ? name(piece.name, locale, piece.id) : t("builds.empty.slot")}</span>
                </li>
              );
            })}
          </ul>
          {sets.map(({ set, n, bonuses }) => (
            <div key={set.id} className="mt-3 border-t border-line pt-2">
              <p className="text-xs font-semibold text-ink-2">
                {name(set.name, locale, set.id)} <span className="font-normal text-muted">({n}{set.pieceCount ? `/${set.pieceCount}` : ""})</span>
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
            {lo.monsterlings.map((m) => (
              <MonFull key={m.id} slot={m} locale={locale} highlight={dup.has(m.id)} traitsLabel={t("builds.traits")} />
            ))}
          </ul>
        </Slot>

        <div className="space-y-3">
          <Slot title={t("builds.linkChain")}>
            <p className="text-sm">{chain ? name(chain.name, locale, chain.id) : t("builds.empty.slot")}</p>
          </Slot>

          <Slot title={t("builds.legendary")}>
            {lo.legendary ? (
              <>
                <div className="flex items-center gap-2">
                  <Icon src={monsterlingImage(lo.legendary)} />
                  <span className="text-sm font-semibold">{name(legendary?.name, locale, lo.legendary)}</span>
                </div>
                <Effects effects={legendary?.speciesEffects ?? []} locale={locale} />
              </>
            ) : (
              <p className="text-sm text-muted">{t("builds.empty.slot")}</p>
            )}
          </Slot>

          <Slot title={t("builds.food")}>
            <div className="space-y-3">
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
        </div>
      </div>

      {lo.teammates.length > 0 && (
        <Slot title={t("builds.team")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {[{ characterId: b.characterId, monsterlings: own }, ...lo.teammates].map((mate) => {
              const c = characterById(mate.characterId);
              return (
                <div key={mate.characterId}>
                  <p className="text-sm font-semibold">
                    <Link href={`/${locale}/characters/${mate.characterId}`} className="hover:underline">
                      {name(c?.name, locale, mate.characterId)}
                    </Link>
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {mate.monsterlings.map((m) => (
                      <MonSmall key={m} id={m} locale={locale} highlight={dup.has(m)} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {dup.size > 0 && <p className="mt-3 text-xs text-gold">{t("builds.dupWarning")}</p>}
        </Slot>
      )}
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
            const c = characterById(b.characterId);
            const img = characterImage(b.characterId);
            return (
              <article key={b.id} id={b.id} className="rounded-xl border border-line p-4">
                <header className="mb-4 flex items-center gap-3">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" width={56} height={56} className="size-14 rounded-full border border-line bg-surface-2 object-cover" />
                  )}
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      <Link href={`/${locale}/characters/${b.characterId}`} className="hover:underline">
                        {name(c?.name, locale as Locale, b.characterId)}
                      </Link>
                    </h2>
                    {c && (
                      <p className="text-xs text-ink-2">
                        <span className="text-gold">{c.rarity !== undefined && "★".repeat(c.rarity)}</span> {label("role", c.role, locale)} ·{" "}
                        {label("element", c.element, locale)}
                      </p>
                    )}
                  </div>
                </header>
                <BuildTabs
                  labels={b.loadouts.map((lo) => `${t("builds.awaken")} ${lo.awaken}`)}
                  panels={b.loadouts.map((lo) => (
                    <Loadout key={lo.awaken} b={b} lo={lo} locale={locale as Locale} t={t} />
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
