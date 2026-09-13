import type { LocalizedText } from "./schema/common";

export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** ไทยเป็นภาษาหลัก — เว็บนี้ทำเพื่อผู้เล่นไทยก่อน */
export const DEFAULT_LOCALE: Locale = "th";

export const LOCALE_LABEL: Record<Locale, string> = { th: "ไทย", en: "English" };
/** ใช้กับ <html lang> และ hreflang */
export const LOCALE_TAG: Record<Locale, string> = { th: "th-TH", en: "en" };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export type PickedText = {
  value: string;
  /** true = ยังไม่มีภาษาที่ขอ กำลังแสดงอีกภาษาแทน หน้าเว็บต้องบอกผู้อ่านให้รู้ */
  isFallback: boolean;
  /** ภาษาที่ได้จริง ใช้กับ lang="" ของ element นั้น เพื่อให้ screen reader อ่านถูก */
  usedLocale: Locale;
};

/**
 * เลือกข้อความตามภาษา พร้อมบอกว่าต้อง fallback หรือเปล่า
 *
 * ข้อมูลเกมมาเป็นอังกฤษก่อนเสมอ แล้วค่อยทยอยแปลไทย ระหว่างนั้นเว็บต้องไม่พัง
 * และต้องไม่ทำเป็นว่าข้อความอังกฤษคือฉบับแปลไทย
 */
export function pickText(text: LocalizedText | undefined, locale: Locale): PickedText | null {
  if (!text) return null;
  const wanted = text[locale];
  if (wanted) return { value: wanted, isFallback: false, usedLocale: locale };

  for (const other of LOCALES) {
    const value = text[other];
    if (value) return { value, isFallback: true, usedLocale: other };
  }
  return null;
}

/** เปลี่ยนภาษาในพาธปัจจุบันโดยคงหน้าเดิมไว้ — /th/characters/nova -> /en/characters/nova */
export function swapLocaleInPath(pathname: string, next: Locale): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0 && isLocale(parts[0])) parts[0] = next;
  else parts.unshift(next);
  return "/" + parts.join("/");
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso + "T00:00:00Z");
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(date);
}
