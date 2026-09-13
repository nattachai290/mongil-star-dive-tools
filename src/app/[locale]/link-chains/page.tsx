import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Text } from "@/components/Text";
import { createTranslate } from "@/i18n";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n";
import { DEX, LINK_CHAINS, chainsSorted, monsterlingImage } from "@/lib/data";
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
  return { title: t("linkChains.title"), description: t("linkChains.lede") };
}

const DEX_BY_SLUG = new Map(DEX.filter((d) => d.slug).map((d) => [d.slug as string, d]));

/** ฟิลด์ที่ยังไม่ยืนยันต้องติดป้ายให้เห็น ไม่ใช่แสดงเหมือนข้อมูลที่เช็คแล้ว */
function isUnverified(paths: string[] | undefined, needle: string): boolean {
  return (paths ?? []).some((p) => p.includes(needle));
}

export default async function LinkChainsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslate(locale as Locale);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">{t("linkChains.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-2">{t("linkChains.lede")}</p>
      <p className="mt-3 text-sm text-muted">
        <strong className="text-ink">{LINK_CHAINS.length}</strong> · {t("linkChains.title")}
      </p>

      <ul className="mt-6 space-y-3">
        {chainsSorted(locale).map((chain) => {
          const owner = DEX_BY_SLUG.get(chain.monsterlingId);
          const image = monsterlingImage(chain.monsterlingId);

          return (
            <li key={chain.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                {image && (
                  <Image
                    src={image}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded bg-surface-2 object-contain"
                  />
                )}
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-semibold">
                    <Text value={chain.name} locale={locale} />
                  </h2>
                  {owner && (
                    <p className="text-xs text-muted">
                      {t("linkChains.owner")}:{" "}
                      <Text value={owner.name} locale={locale} showFallbackBadge={false} />
                    </p>
                  )}
                </div>
              </div>

              {chain.levels.map((level) => {
                const unverified = chain.source.fieldsUnverified;
                return (
                  <div key={level.level} className="mt-3 border-t border-line pt-3">
                    <p className="font-mono text-xs text-gold">
                      {t("linkChains.level")} {level.level}
                    </p>

                    <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted">{t("linkChains.condition")}</dt>
                        <dd className="text-ink">
                          {level.appearanceConditions
                            .map((c) => label("appearanceCondition", c, locale))
                            .join(" · ")}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-muted">{t("linkChains.info")}</dt>
                        <dd className="text-ink">
                          {level.appearanceInfo.dmgPercentOfAtk !== undefined ? (
                            <>
                              {t("linkChains.dmgOfAtk")}: {level.appearanceInfo.dmgPercentOfAtk}%
                            </>
                          ) : (
                            <span className="text-muted">{t("linkChains.noDamage")}</span>
                          )}
                          {level.appearanceInfo.cooldownSec !== undefined && (
                            <>
                              {" · "}
                              {t("linkChains.cooldown")}: {level.appearanceInfo.cooldownSec}s
                            </>
                          )}
                        </dd>
                      </div>
                    </dl>

                    {level.bonusEffects && level.bonusEffects.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted">{t("linkChains.bonus")}</p>
                        <ul className="mt-1 space-y-0.5">
                          {level.bonusEffects.map((b, i) => (
                            <li key={i} className="text-sm text-ink">
                              <Text value={b} locale={locale} />
                              {isUnverified(unverified, `bonusEffects[${i}]`) && (
                                <span
                                  className="ms-1.5 rounded bg-surface-2 px-1.5 py-0.5 align-middle font-mono text-[10px] text-muted"
                                  title={t("data.unverifiedTitle")}
                                >
                                  {t("data.unverified")}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
