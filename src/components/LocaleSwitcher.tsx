"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABEL, LOCALE_TAG, swapLocaleInPath, type Locale } from "@/lib/i18n";
import { createTranslate } from "@/i18n";

/**
 * สลับภาษาโดยอยู่หน้าเดิม — /th/characters/nova จะไปที่ /en/characters/nova
 * ใช้ <Link> ไม่ใช่ปุ่ม เพื่อให้คลิกขวาเปิดแท็บใหม่ได้และ Google ตามลิงก์เจอทั้งสองภาษา
 *
 * href ที่เรนเดอร์ไว้เป็น URL สะอาดไม่มี query — ดีต่อ SEO และแท็บใหม่
 * ส่วนการคลิกซ้ายจะพา query ข้ามไปด้วย ไม่งั้นคำที่พิมพ์ค้นค้างไว้จะหายตอนสลับภาษา
 *
 * scroll={false} ทั้งสองทาง เพราะปกติ Next จะเด้งขึ้นบนสุดทุกครั้งที่เปลี่ยนหน้า
 * แต่สลับภาษาไม่ใช่การไปหน้าอื่น มันคือหน้าเดิมคนละภาษา คนอ่านค้างอยู่ตรงไหนควรอยู่ตรงนั้น
 * (เมนูด้านบนที่พาไปหน้าอื่นจริง ๆ ยังเด้งขึ้นบนเหมือนเดิม ซึ่งถูกแล้ว)
 */
export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
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
            scroll={false}
            onClick={(e) => {
              const search = window.location.search;
              if (active || !search) return;
              // ปล่อยให้คลิกที่ตั้งใจเปิดแท็บใหม่ (ctrl/cmd/กลาง) ทำงานตามปกติ
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              router.push(`${swapLocaleInPath(pathname, target)}${search}`, { scroll: false });
            }}
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
