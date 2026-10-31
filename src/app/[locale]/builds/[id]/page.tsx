import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { BUILDS, characterById } from "@/lib/data";
import { BuildView } from "../build-view";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => BUILDS.map((b) => ({ locale, id: b.id })));
}

const teamTitle = (id: string, locale: Locale) => {
  const b = BUILDS.find((x) => x.id === id);
  const mainId = b?.loadouts[0].members[0].characterId ?? id;
  const n = characterById(mainId)?.name;
  return createTranslate(locale)("builds.teamOf").replace("{name}", n?.[locale] ?? n?.en ?? n?.th ?? mainId);
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale) || !BUILDS.some((b) => b.id === id)) return {};
  return { title: teamTitle(id, locale), description: createTranslate(locale)("builds.lede") };
}

/** หน้าทีมหนึ่งทีม */
export default async function BuildPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const b = BUILDS.find((x) => x.id === id);
  if (!b) notFound();
  const t = createTranslate(locale);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href={`/${locale}/builds`} className="text-sm text-ink-2 hover:underline">
        ← {t("builds.back")}
      </Link>
      <div className="mt-4">
        <BuildView b={b} locale={locale} t={t} />
      </div>
    </div>
  );
}
