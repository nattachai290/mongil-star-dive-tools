"use client";

import { createTranslate } from "@/i18n";
import type { Locale } from "@/lib/i18n";

/**
 * ธีมถูกตั้งไว้บน <html data-theme> โดยสคริปต์ใน layout ตั้งแต่ก่อน paint
 * คอมโพเนนต์นี้เลยไม่เก็บ state เอง — อ่านค่าจาก DOM ตอนกด และให้ CSS
 * เป็นตัวเลือกว่าจะโชว์ป้ายไหน จึงไม่มีปัญหา hydration ไม่ตรงกัน
 */
export function ThemeToggle({ locale }: { locale: Locale }) {
  const t = createTranslate(locale);

  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // โหมดส่วนตัวหรือปิด storage ไว้ — เปลี่ยนธีมได้แต่ไม่จำข้ามหน้า
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("theme.label")}
      className="rounded border border-line bg-surface px-3 py-1.5 text-xs text-ink-2 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <span className="dark:hidden">{t("theme.toDark")}</span>
      <span className="hidden dark:inline">{t("theme.toLight")}</span>
    </button>
  );
}
