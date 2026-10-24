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

/** บัฟแต่ละแหล่งของแท็บนี้ — เฉพาะเอฟเฟกต์ที่แปลงเป็นตัวเลขไว้แล้วในข้อมูล */
function buffSources(lo: BuildLoadout, locale: Locale) {
  const out: { from: string; effects: Effect[] }[] = [];
  const art = ARTIFACTS.find((a) => a.id === lo.artifact);
  if (art) {
    const top = [...art.fusion].sort((a, b) => b.artifactLevel - a.artifactLevel)[0];
    if (top?.effects.length) out.push({ from: name(art.name, locale, art.id), effects: top.effects });
  }
  const counts = new Map<string, number>();
  for (const slot of SLOTS) {
    const piece = EQUIPMENT.find((e) => e.id === lo.equipment[slot]);
    if (piece?.setId) counts.set(piece.setId, (counts.get(piece.setId) ?? 0) + 1);
  }
  for (const [setId, n] of counts) {
    const set = EQUIPMENT_SETS.find((s) => s.id === setId);
    if (!set) continue;
    for (const b of set.bonuses.filter((b) => b.pieces <= n)) {
      if (b.effects.length) {
        out.push({ from: `${name(set.name, locale, set.id)} (${b.pieces})`, effects: b.effects });
      }
    }
  }
  for (const id of [...lo.monsterlings, ...(lo.legendary ? [lo.legendary] : [])]) {
    const m = MONSTERLINGS.get(id);
    if (m?.speciesEffects.length) out.push({ from: name(m.name, locale, id), effects: m.speciesEffects });
  }
  for (const dish of [lo.food.entree, lo.food.side]) {
    const f = FOOD.find((x) => x.id === dish);
    if (f?.effects.length) out.push({ from: name(f.name, locale, f.id), effects: f.effects });
  }
  return out;
}

function Mon({ id, locale }: { id: string; locale: Locale }) {
  const m = MONSTERLINGS.get(id);
  const img = monsterlingImage(id);
  return (
    <li className="flex items-center gap-2">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" width={36} height={36} className="size-9 rounded-full border border-line bg-surface-2" />
      ) : (
        <span className="size-9 rounded-full border border-line bg-surface-2" />
      )}
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
  const chain = LINK_CHAINS.find((c) => c.id === lo.linkChain);
  const dish = (id?: string) => FOOD.find((f) => f.id === id);

  // มอนตัวเดียวกันบนหลายคนในทีม บัฟไม่ทับซ้อน
  const all = [...lo.monsterlings, ...lo.teammates.flatMap((m) => m.monsterlings)];
  const dup = new Set(all.filter((m, i) => all.indexOf(m) !== i));

  const buffs = buffSources(lo, locale);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Slot title={t("builds.artifact")}>
          {art ? (
            <div className="flex items-center gap-2">
              {art.images?.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset(`/images/artifacts/${art.images.icon}`)} alt="" width={40} height={40} className="size-10 rounded-full border border-line bg-surface-2" />
              )}
              <div>
                <p className="text-sm font-semibold">{name(art.name, locale, art.id)}</p>
                <p className="text-xs text-gold">{art.stars !== undefined && "★".repeat(art.stars)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{t("builds.empty.slot")}</p>
          )}
        </Slot>

        <Slot title={t("builds.equipment")}>
          <ul className="space-y-1 text-sm">
            {SLOTS.map((slot) => {
              const piece = EQUIPMENT.find((e) => e.id === lo.equipment[slot]);
              const set = EQUIPMENT_SETS.find((s) => s.id === piece?.setId);
              return (
                <li key={slot} className="flex gap-2">
                  <span className="w-20 shrink-0 text-xs text-muted">{label("slot", slot, locale)}</span>
                  <span>
                    {piece ? name(piece.name, locale, piece.id) : t("builds.empty.slot")}
                    {set && <span className="text-xs text-muted"> · {name(set.name, locale, set.id)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Slot>

        <Slot title={`${t("builds.monsterlings")} · ${t("builds.linkChain")} · ${t("builds.legendary")}`}>
          <ul className="space-y-1.5">
            {lo.monsterlings.map((m) => (
              <Mon key={m} id={m} locale={locale} />
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <span className="text-xs text-muted">{t("builds.linkChain")}: </span>
            {chain ? name(chain.name, locale, chain.id) : t("builds.empty.slot")}
          </p>
          {lo.legendary && (
            <ul className="mt-2 border-t border-line pt-2">
              <Mon id={lo.legendary} locale={locale} />
            </ul>
          )}
        </Slot>

        <Slot title={t("builds.food")}>
          <ul className="space-y-1 text-sm">
            {(["entree", "side"] as const).map((cat) => {
              const f = dish(lo.food[cat]);
              return (
                <li key={cat} className="flex gap-2">
                  <span className="w-20 shrink-0 text-xs text-muted">{label("foodCategory", cat, locale)}</span>
                  <span>{f ? name(f.name, locale, f.id) : t("builds.empty.slot")}</span>
                </li>
              );
            })}
          </ul>
        </Slot>
      </div>

      {lo.teammates.length > 0 && (
        <Slot title={t("builds.team")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {[{ characterId: b.characterId, monsterlings: lo.monsterlings }, ...lo.teammates].map((mate) => {
              const c = characterById(mate.characterId);
              return (
                <div key={mate.characterId}>
                  <p className="text-sm font-semibold">
                    <Link href={`/${locale}/characters/${mate.characterId}`} className="hover:underline">
                      {name(c?.name, locale, mate.characterId)}
                    </Link>
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {mate.monsterlings.map((m) => (
                      <li key={m} className={dup.has(m) ? "rounded ring-1 ring-gold" : undefined}>
                        <ul>
                          <Mon id={m} locale={locale} />
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {dup.size > 0 && <p className="mt-3 text-xs text-gold">{t("builds.dupWarning")}</p>}
        </Slot>
      )}

      {buffs.length > 0 && (
        <Slot title={t("builds.buffs")}>
          <p className="text-[11px] text-muted">{t("builds.buffsNote")}</p>
          <div className="mt-2 space-y-3">
            {buffs.map((src, i) => (
              <div key={i}>
                <p className="text-xs font-semibold text-ink-2">{src.from}</p>
                <div className="mt-1 space-y-1.5">
                  {src.effects.map((e, j) => (
                    <EffectLine key={j} effect={e} locale={locale} />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
