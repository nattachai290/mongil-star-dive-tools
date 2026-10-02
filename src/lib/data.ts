import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { monsterDexEntry, linkChain, monsterling, character, equipment, equipmentSet, gearMainStat, gearSubstat, traitPool, dropSources } from "./schema/entities";
import type { Character, Equipment, EquipmentSet, GearMainStat, GearSubstat, LinkChain, Monsterling, TraitPool, DropSources } from "./schema/entities";

/**
 * อ่านข้อมูลจาก data/ ตอน build — ไม่มี API ไม่มีฐานข้อมูล
 *
 * ทุกไฟล์ผ่าน schema เดิมที่ validate:data ใช้ ถ้าข้อมูลพัง build จะล้มทันที
 * ไม่ใช่ไปโผล่เป็นหน้าเว็บที่ข้อมูลหาย
 */
const DATA = join(process.cwd(), "data");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readCollection<T>(dir: string, parse: (raw: unknown) => T): T[] {
  const full = join(DATA, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith(".json"))
    .map((f) => parse(readJson(join(full, f))));
}

export type DexEntry = ReturnType<typeof monsterDexEntry.parse>;

/** สมุดภาพมอน — ดัชนีของมอนทั้ง 169 ตัว ใช้เป็นรายการหลักของหน้ามอนสเตอร์ลิง */
export const DEX: DexEntry[] = (() => {
  const raw = readJson(join(DATA, "meta", "monster-dex.json")) as { entries: unknown[] };
  const BOOK_ORDER = ["field", "legendary", "event"];
  return raw.entries
    .map((e) => monsterDexEntry.parse(e))
    .sort((a, b) => BOOK_ORDER.indexOf(a.book) - BOOK_ORDER.indexOf(b.book) || a.no - b.no);
})();

/** มอนที่มีข้อมูลเอฟเฟกต์แล้ว — ยังไม่ครบทุกตัว หน้าเว็บต้องรับสภาพนี้ได้ */
export const MONSTERLINGS: Map<string, Monsterling> = new Map(
  readCollection("monsterlings", (raw) => monsterling.parse(raw)).map((m) => [m.id, m]),
);

export const LINK_CHAINS: LinkChain[] = readCollection("link-chains", (raw) =>
  linkChain.parse(raw),
);

/** เรียงตามชื่อของภาษาที่กำลังแสดง — หน้าไทยที่เรียงตามชื่ออังกฤษอ่านแล้วหาไม่เจอ */
export function chainsSorted(locale: "th" | "en"): LinkChain[] {
  const key = (c: LinkChain) => c.name[locale] ?? c.name.en ?? c.name.th ?? c.id;
  return [...LINK_CHAINS].sort((a, b) => key(a).localeCompare(key(b), locale));
}

/** ตัวละครที่ลงข้อมูลแล้ว — เรียงตามชื่อของภาษาที่แสดง เหมือนลิงก์เชน */
export const CHARACTERS: Character[] = readCollection("characters", (raw) =>
  character.parse(raw),
);

export function charactersSorted(locale: "th" | "en"): Character[] {
  const key = (c: Character) => c.name[locale] ?? c.name.en ?? c.name.th ?? c.id;
  return [...CHARACTERS].sort((a, b) => key(a).localeCompare(key(b), locale));
}

export function characterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

/**
 * รูปตัวละคร — ยังไม่มีสักตัว ฟังก์ชันจึงคืน null ได้และหน้าเว็บต้องรับได้
 * เช็คไฟล์จริงแทนที่จะเชื่อ images.icon ในข้อมูล เพราะไฟล์อาจยังไม่ถูกวาง
 */
export function characterImage(id: string): string | null {
  for (const file of [`${id}-portrait.webp`, `${id}-icon.webp`]) {
    if (existsSync(join(process.cwd(), "public", "images", "characters", file))) {
      return `/images/characters/${file}`;
    }
  }
  return null;
}

/** ชิ้นอุปกรณ์ทั้งหมด — ผูกกับเซ็ตด้วย setId */
export const EQUIPMENT: Equipment[] = readCollection("equipment", (raw) => equipment.parse(raw));

/**
 * เซ็ตอุปกรณ์อยู่ใน meta/sets.json ไม่ใช่โฟลเดอร์ของตัวเอง
 * เพราะเป็นของกลางที่อุปกรณ์หลายชิ้นอ้างถึง ไม่ใช่ของที่มีไฟล์ละชิ้น
 *
 * เรียงตามลำดับในไฟล์ ซึ่งคือลำดับที่จอคราฟต์ในเกมเรียงไว้
 */
export const EQUIPMENT_SETS: EquipmentSet[] = (
  readJson(join(DATA, "meta", "sets.json")) as unknown[]
).map((raw) => equipmentSet.parse(raw));

/**
 * ค่าหลักต่อช่อง — ของกลางเหมือน sets.json ไม่ใช่ของที่มีไฟล์ละชิ้น
 * เพราะทุกชิ้นในช่องเดียวกันและระดับเดียวกันได้ค่าเท่ากันหมด
 */
export const GEAR_MAIN_STATS: GearMainStat[] = (
  readJson(join(DATA, "meta", "gear-main-stats.json")) as unknown[]
).map((raw) => gearMainStat.parse(raw));

/** ตารางออปชันรอง — ของกลางเหมือนค่าหลัก ทุกช่องใช้ตารางเดียวกัน */
export const GEAR_SUBSTATS: GearSubstat[] = (
  readJson(join(DATA, "meta", "gear-substats.json")) as unknown[]
).map((raw) => gearSubstat.parse(raw));

/**
 * คลังลักษณะเฉพาะที่สุ่มใส่มอนตอนจับ — ของกลางไฟล์เดียว ไม่ผูกกับมอนตัวไหน
 * ถ้าวันหนึ่งมันไปโผล่อยู่ในไฟล์มอน แปลว่ามีคนเข้าใจผิดแล้ว
 */
export const TRAIT_POOL: TraitPool = traitPool.parse(readJson(join(DATA, "meta", "traits.json")));

/**
 * ศัตรูที่ดรอปของแต่ไม่มีมอนสเตอร์ลิง — ของดรอปที่เหลือแขวนอยู่กับไฟล์มอนตามเดิม
 * ที่นี่มีเฉพาะตัวที่ไม่มีไฟล์มอนให้แขวน
 */
export const DROP_SOURCES: DropSources = dropSources.parse(
  readJson(join(DATA, "meta", "drop-sources.json")),
);

/** ชิ้นของเซ็ตหนึ่ง เรียงตามลำดับช่องบนตัวละคร ไม่ใช่ตามชื่อไฟล์ */
const SLOT_ORDER = ["headgear", "chestpiece", "gloves", "footwear"];
export function piecesOfSet(setId: string): Equipment[] {
  return EQUIPMENT.filter((e) => e.setId === setId).sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
  );
}

export function monsterlingImage(slug: string): string | null {
  const file = `${slug}-icon.webp`;
  return existsSync(join(process.cwd(), "public", "images", "monsterlings", file))
    ? `/images/monsterlings/${file}`
    : null;
}
