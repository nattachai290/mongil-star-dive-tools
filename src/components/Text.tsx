import type { LocalizedText } from "@/lib/schema/common";
import { pickText, LOCALE_TAG, type Locale } from "@/lib/i18n";
import { createTranslate } from "@/i18n";

/**
 * แสดงข้อความสองภาษา และติดป้าย "ยังไม่แปล" เมื่อต้อง fallback
 *
 * เว็บไม่พังระหว่างทยอยแปล แต่ก็ไม่ทำเป็นว่าข้อความอังกฤษคือฉบับแปลไทย
 * lang="" บน element ทำให้ screen reader และการตัดบรรทัดทำงานถูกภาษา
 */
export function Text({
  value,
  locale,
  showFallbackBadge = true,
}: {
  value: LocalizedText | undefined;
  locale: Locale;
  showFallbackBadge?: boolean;
}) {
  const picked = pickText(value, locale);
  if (!picked) return null;

  const t = createTranslate(locale);
  const lang = picked.isFallback ? LOCALE_TAG[picked.usedLocale] : undefined;

  return (
    <>
      <span lang={lang}>{picked.value}</span>
      {picked.isFallback && showFallbackBadge && (
        <span
          className="ms-1.5 rounded bg-surface-2 px-1.5 py-0.5 align-middle font-mono text-[10px] text-muted"
          title={t("locale.untranslatedTitle")}
        >
          {t("locale.untranslated")}
        </span>
      )}
    </>
  );
}
