import { z } from "zod";
import vocabulary from "../../data/meta/vocabulary.json";

/**
 * คำศัพท์ทั้งหมดมาจาก data/meta/vocabulary.json ไฟล์เดียว
 * ทั้ง schema ที่ใช้ตรวจข้อมูล และป้ายข้อความบนหน้าเว็บ อ่านจากที่นี่
 * เพิ่มธาตุหรือบทบาทใหม่ตอนเกมอัปเดต = แก้ JSON อย่างเดียว ไม่ต้องแตะโค้ด
 */
export const VOCAB = vocabulary;

export type VocabGroup = Exclude<keyof typeof vocabulary, "_meta">;
export type Label = { th: string; en: string };

const GROUPS = Object.keys(vocabulary).filter((k) => k !== "_meta") as VocabGroup[];

export function groupNames(): VocabGroup[] {
  return GROUPS;
}

export function termsOf(group: VocabGroup): string[] {
  return Object.keys(vocabulary[group] as Record<string, Label>);
}

export function label(group: VocabGroup, term: string, locale: "th" | "en" = "th"): string {
  const entry = (vocabulary[group] as Record<string, Label>)[term];
  // คำที่ไม่มีในพจนานุกรมไม่ควรหลุดมาถึงตรงนี้ — validate:data จะจับได้ก่อน
  return entry ? (entry[locale] ?? entry.en) : term;
}

/** zod enum ที่ผูกกับพจนานุกรม — พิมพ์ผิดจะ fail ตอน validate ไม่ใช่ตอนคนใช้เจอเลขเพี้ยน */
export function vocabEnum(group: VocabGroup) {
  const terms = termsOf(group);
  return z.enum(terms as [string, ...string[]]);
}
