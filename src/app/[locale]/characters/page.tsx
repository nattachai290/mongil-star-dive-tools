import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { CHARACTERS, characterImage, charactersSorted } from "@/lib/data";
import { label } from "@/lib/vocabulary";

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
  return { title: t("characters.title"), description: t("characters.lede") };
}

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);
  const characters = charactersSorted(locale);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("characters.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("characters.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">{CHARACTERS.length}</strong> {t("characters.count")}
      </p>

      {characters.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("characters.empty")}</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {characters.map((c) => {
            const image = characterImage(c.id);
            return (
              <li key={c.id}>
                <Link
                  href={`/${locale}/characters/${c.id}`}
                  className="flex gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      width={64}
                      height={64}
                      className="size-16 shrink-0 rounded bg-surface-2 object-cover"
                    />
                  ) : (
                    <div className="grid size-16 shrink-0 place-items-center rounded bg-surface-2 text-center text-[10px] leading-tight text-muted">
                      {t("character.noImage")}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold">
                      <Text value={c.name} locale={locale} />
                    </p>
                    <p className="mt-1 text-xs text-gold">
                      {"★".repeat(c.rarity)}{" "}
                      <span className="text-muted">
                        {c.rarity} {t("character.stars")}
                      </span>
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {[
                        label("element", c.element, locale),
                        label("role", c.role, locale),
                        ...(c.range ? [label("range", c.range, locale)] : []),
                      ].map((chip) => (
                        <li
                          key={chip}
                          className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] leading-tight text-ink-2"
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
