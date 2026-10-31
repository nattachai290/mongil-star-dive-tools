import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { BUILDS, characterById, characterImage } from "@/lib/data";
import { label } from "@/lib/vocabulary";
import type { LocalizedText } from "@/lib/schema/common";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = createTranslate(locale);
  return { title: t("builds.title"), description: t("builds.lede") };
}

const name = (v: LocalizedText | undefined, locale: Locale, fallback: string) => v?.[locale] ?? v?.en ?? v?.th ?? fallback;

/** ธาตุเรียงตามที่เกมเรียงบนจอตัวกรอง */
const ELEMENTS = ["fire", "ice", "wind", "lightning", "earth"];

function Portrait({ id, size }: { id: string; size: "lg" | "sm" }) {
  const img = characterImage(id);
  const cls = size === "lg" ? "size-14 rounded-xl" : "size-8 rounded-lg";
  return img ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img} alt="" width={size === "lg" ? 56 : 32} height={size === "lg" ? 56 : 32} className={`${cls} shrink-0 object-cover`} />
  ) : (
    <span className={`${cls} shrink-0 bg-surface-2`} />
  );
}

/**
 * หน้ารวมบิ้ว — การ์ดทีมละใบ แบ่งตามธาตุของตัวหลัก กดเข้าไปดูหน้าทีม
 * แยกหน้าทีมออกไปเพราะบิ้วทุกตัวรวมกันหน้าเดียวหนักเกิน (ทีมละ ~0.5 MB) · ผู้เล่นสั่งทำบิ้วทุกตัว 2026-10-31
 */
export default async function BuildsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslate(locale);

  const cards = BUILDS.map((b) => {
    const members = b.loadouts[0].members;
    const main = characterById(members[0].characterId);
    return { b, members, main };
  }).sort((x, y) => (y.main?.rarity ?? 0) - (x.main?.rarity ?? 0) || name(x.main?.name, locale, x.b.id).localeCompare(name(y.main?.name, locale, y.b.id)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold">{t("builds.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("builds.lede")}</p>

      {cards.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("builds.empty")}</p>
      ) : (
        <div className="mt-8 space-y-10">
          {ELEMENTS.map((el) => {
            const group = cards.filter((c) => c.main?.element === el);
            if (group.length === 0) return null;
            return (
              <section key={el} aria-labelledby={`el-${el}`}>
                <h2 id={`el-${el}`} className="mb-3 font-display text-lg font-semibold">
                  {label("element", el, locale)}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.map(({ b, members, main }) => (
                    <li key={b.id}>
                      <Link
                        href={`/${locale}/builds/${b.id}`}
                        className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-rail focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail"
                      >
                        <div className="flex items-center gap-3">
                          <Portrait id={members[0].characterId} size="lg" />
                          <div className="min-w-0">
                            <p className="font-display text-lg font-semibold leading-tight">
                              {t("builds.teamOf").replace("{name}", name(main?.name, locale, members[0].characterId))}
                            </p>
                            <p className="text-xs text-ink-2">
                              {main && `${"★".repeat(main.rarity ?? 0)} · ${label("role", main.role, locale)}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {members.slice(1).map((m) => (
                            <span key={m.characterId} className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 ps-1 pe-3 text-xs text-ink-2">
                              <Portrait id={m.characterId} size="sm" />
                              {name(characterById(m.characterId)?.name, locale, m.characterId)}
                            </span>
                          ))}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
