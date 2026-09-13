"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_LABEL, LOCALE_TAG, swapLocaleInPath, type Locale } from "@/lib/i18n";
import { createTranslate } from "@/i18n";

/**
 * สลับภาษาโดยอยู่หน้าเดิม — /th/characters/nova จะไปที่ /en/characters/nova
 * ใช้ <Link> ไม่ใช่ปุ่ม เพื่อให้คลิกขวาเปิดแท็บใหม่ได้และ Google ตามลิงก์เจอทั้งสองภาษา
 */
export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const t = createTranslate(locale);

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("locale.label")}>
      {LOCALES.map((target) => {
        const active = target === locale;
        return (
          <Link
            key={target}
            href={swapLocaleInPath(pathname, target)}
            hrefLang={LOCALE_TAG[target]}
            aria-current={active ? "true" : undefined}
            className={
              "rounded border px-2.5 py-1.5 font-mono text-[11px] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
              (active
                ? "border-line bg-surface-2 text-ink"
                : "border-transparent text-muted hover:text-ink")
            }
          >
            <span className="sr-only">{LOCALE_LABEL[target]}</span>
            <span aria-hidden="true">{target}</span>
          </Link>
        );
      })}
    </div>
  );
}
