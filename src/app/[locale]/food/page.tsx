import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EffectLine } from "@/components/EffectLine";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { FOOD, foodSorted } from "@/lib/data";
import { asset } from "@/lib/base-path";
import { label } from "@/lib/vocabulary";
import type { Food } from "@/lib/schema/entities";

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
  return { title: t("food.title"), description: t("food.lede") };
}

type T = ReturnType<typeof createTranslate>;

/** จานหลักก่อนจานเคียง ตามลำดับแท็บในจอ Cooking */
const CATEGORIES = ["entree", "side"] as const;

function FoodCard({ f, locale, t }: { f: Food; locale: Locale; t: T }) {
  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        {f.images?.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset(`/images/food/${f.images.icon}`)}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-full border border-line bg-surface-2"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold">
            <Text value={f.name} locale={locale} showFallbackBadge={false} />
          </h3>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs">
            {f.stars !== undefined && <span className="text-gold">{"★".repeat(f.stars)}</span>}
            <span className="font-mono text-[11px] text-muted">
              {t("food.duration")} {f.durationSec / 60} {t("food.minutes")}
            </span>
          </p>
        </div>
      </div>
      {f.effects.length > 0 && (
        <div className="mt-3 space-y-2">
          {f.effects.map((e, i) => (
            <EffectLine key={i} effect={e} locale={locale} />
          ))}
        </div>
      )}
    </li>
  );
}

export default async function FoodPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);
  const list = foodSorted(locale);
  const missingThai = FOOD.some((f) => !f.name.th);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("food.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("food.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">{list.length}</strong> {t("food.count")}
      </p>
      {missingThai && locale === "th" && (
        <p className="mt-1 max-w-2xl text-xs text-muted">{t("food.enOnlyNote")}</p>
      )}

      {list.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("food.empty")}</p>
      ) : (
        CATEGORIES.map((cat) => {
          const items = list.filter((f) => f.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} className="mt-6">
              <h2 className="font-display text-lg font-semibold">
                {label("foodCategory", cat, locale)}{" "}
                <span className="text-sm font-normal text-muted">({items.length})</span>
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f) => (
                  <FoodCard key={f.id} f={f} locale={locale as Locale} t={t} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
