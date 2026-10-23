import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EffectLine } from "@/components/EffectLine";
import { FilteredList, type FilteredRow } from "@/components/FilteredList";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { ARTIFACTS, artifactsSorted } from "@/lib/data";
import { byNumberDesc, haystackOf, optionsFrom } from "@/lib/facets";
import { asset } from "@/lib/base-path";
import { label } from "@/lib/vocabulary";
import type { Artifact } from "@/lib/schema/entities";

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
  return { title: t("artifacts.title"), description: t("artifacts.lede") };
}

type T = ReturnType<typeof createTranslate>;

function ArtifactCard({ a, locale, t }: { a: Artifact; locale: Locale; t: T }) {
  const fmt = (n: number) => n.toLocaleString(locale === "th" ? "th-TH" : "en-US");

  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        {a.images?.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset(`/images/artifacts/${a.images.icon}`)}
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-full border border-line bg-surface-2"
          />
        )}
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold">
            <Text value={a.name} locale={locale} showFallbackBadge={false} />
          </h2>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs">
            {a.stars !== undefined && <span className="text-gold">{"★".repeat(a.stars)}</span>}
            <span className="text-ink-2">{label("role", a.role, locale)}</span>
            <span className="font-mono text-[11px] text-muted">
              {t("artifacts.level")} {a.level}
            </span>
          </p>
        </div>
      </div>

      <table className="mt-3 w-full text-sm">
        <tbody>
          {a.stats.map((s, i) => (
            <tr key={i} className="border-t border-line">
              <td className="py-1.5 text-ink-2">
                {s.damageType
                  ? `${label("stat", s.stat, locale)} ${label("damageType", s.damageType, locale)}`
                  : label("stat", s.stat, locale)}
              </td>
              <td className="py-1.5 text-end font-mono tabular-nums text-ink">
                {fmt(s.value)}
                {s.unit === "percent" ? "%" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {a.fusion.length > 0 && (
        <p className="mt-3 text-[11px] text-muted">
          {t("artifacts.roleOnly")}: {label("role", a.role, locale)}
        </p>
      )}
      {/* จอ Lv.60 ก่อน — คนส่วนใหญ่อยากรู้ค่าตอนอัปเต็ม */}
      {[...a.fusion]
        .sort((x, y) => y.artifactLevel - x.artifactLevel)
        .map((f, i) => (
          <section key={i} className="mt-3 border-s-2 border-line ps-2.5">
            <p className="font-mono text-[11px] text-gold">
              {f.level !== undefined ? `${t("artifacts.fusion")} ${f.level}` : t("artifacts.fusionUnread")}
              <span className="text-muted">
                {" · "}
                {t("artifacts.atLevel")} {f.artifactLevel}
              </span>
            </p>
            {f.name && (
              <h3 className="mt-0.5 text-sm font-semibold">
                <Text value={f.name} locale={locale} showFallbackBadge={false} />
              </h3>
            )}
            {f.effects.length > 0 && (
              <div className="mt-2 space-y-2">
                {f.effects.map((e, j) => (
                  <EffectLine key={j} effect={e} locale={locale} />
                ))}
              </div>
            )}
            {/* ข้อความตามจอเต็ม ๆ — บางบรรทัด (เช่นโบนัสตามความชำนาญ) ยังแปลงเป็นเอฟเฟกต์ไม่ได้ */}
            <div className="mt-2 space-y-1 text-xs leading-relaxed text-ink-2">
              {(f.desc[locale] ?? f.desc.en ?? f.desc.th ?? "")
                .split(" / ")
                .map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
            </div>
          </section>
        ))}
    </li>
  );
}

export default async function ArtifactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);
  const list = artifactsSorted(locale);
  const missingThai = ARTIFACTS.some((a) => !a.name.th);

  const rows: FilteredRow[] = list.map((a) => {
    const effects = a.fusion.flatMap((f) => f.effects);
    const damageTypes = [
      ...a.stats.map((s) => s.damageType),
      ...effects.flatMap((e) => [e.damageType, e.condition?.triggerDamageType]),
    ].filter((v): v is string => Boolean(v));
    return {
      key: a.id,
      facets: {
        stars: a.stars !== undefined ? [String(a.stars)] : [],
        role: [a.role],
        // ค่าสเตตัสบรรทัดสอง — บรรทัดแรกเป็น ATK คงที่ทุกชิ้น กรองไปก็ได้ทุกชิ้น
        stat: [...new Set(a.stats.slice(1).map((s) => s.stat))],
        damageType: [...new Set(damageTypes)],
        trigger: [...new Set(effects.map((e) => e.trigger))],
        target: [...new Set(effects.map((e) => e.target))],
      },
      haystack: haystackOf([
        a.id,
        a.name.th,
        a.name.en,
        ...a.fusion.flatMap((f) => [f.name?.th, f.name?.en, f.desc.th, f.desc.en]),
      ]),
      card: <ArtifactCard key={a.id} a={a} locale={locale as Locale} t={t} />,
    };
  });

  const facets = [
    { key: "stars", param: "r", legend: t("filters.stars"),
      options: optionsFrom(rows, "stars", (v) => `${"★".repeat(Number(v))} ${v}`, byNumberDesc) },
    { key: "role", param: "role", legend: t("filters.role"),
      options: optionsFrom(rows, "role", (v) => label("role", v, locale)) },
    { key: "stat", param: "stat", legend: t("filters.mainStat"),
      options: optionsFrom(rows, "stat", (v) => label("stat", v, locale)) },
    { key: "damageType", param: "dmg", legend: t("filters.damageType"),
      options: optionsFrom(rows, "damageType", (v) => label("damageType", v, locale)) },
    { key: "trigger", param: "trig", legend: t("filters.trigger"),
      options: optionsFrom(rows, "trigger", (v) => label("trigger", v, locale)) },
    { key: "target", param: "for", legend: t("filters.target"),
      options: optionsFrom(rows, "target", (v) => label("target", v, locale)) },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("artifacts.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("artifacts.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">{list.length}</strong> {t("artifacts.count")}
      </p>
      {missingThai && locale === "th" && (
        <p className="mt-1 max-w-2xl text-xs text-muted">{t("artifacts.enOnlyNote")}</p>
      )}

      {list.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("artifacts.empty")}</p>
      ) : (
        <FilteredList
          idPrefix="artifacts"
          rows={rows}
          facets={facets}
          listClassName="mt-6 grid gap-4 md:grid-cols-2"
          labels={{
            search: t("artifacts.search"),
            matches: t("artifacts.matches"),
            noMatch: t("artifacts.noMatch"),
            filters: t("filters.legend"),
            any: t("filters.any"),
            clear: t("filters.clear"),
          }}
        />
      )}
    </div>
  );
}
