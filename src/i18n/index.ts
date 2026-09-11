import type { Locale } from "../lib/i18n";
import en from "./en.json";
import th from "./th.json";

/**
 * ข้อความของตัวเว็บเอง (ปุ่ม หัวข้อ ป้ายกำกับ) อยู่ที่นี่
 * ส่วนข้อมูลเกม (ชื่อตัวละคร คำบรรยายสกิล) อยู่ในไฟล์ data/ เป็น { th, en } อยู่แล้ว
 * สองอย่างนี้แยกกันเพราะอัปเดตคนละจังหวะ
 */
const CATALOG = { th, en } as const;

/** ภาษาอังกฤษเป็นตัวตั้ง key ทั้งหมด — ภาษาอื่นต้องมีครบเท่านี้ ไม่งั้น typecheck fail */
export type MessageKey = keyof typeof en;

export function getMessages(locale: Locale): Record<MessageKey, string> {
  return CATALOG[locale];
}

export type Translate = (key: MessageKey) => string;

export function createTranslate(locale: Locale): Translate {
  const messages = getMessages(locale);
  return (key) => messages[key];
}
