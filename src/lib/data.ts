import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { monsterDexEntry, linkChain, monsterling } from "./schema/entities";
import type { LinkChain, Monsterling } from "./schema/entities";

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

/** ลิงก์เชนที่ชี้มาที่มอนตัวนี้ — ใช้ทั้งป้ายบนการ์ดและหน้ารายละเอียด */
export const CHAINS_BY_MONSTERLING: Map<string, LinkChain[]> = (() => {
  const map = new Map<string, LinkChain[]>();
  for (const chain of LINK_CHAINS) {
    const list = map.get(chain.monsterlingId) ?? [];
    list.push(chain);
    map.set(chain.monsterlingId, list);
  }
  return map;
})();

export function monsterlingImage(slug: string): string | null {
  const file = `${slug}-icon.webp`;
  return existsSync(join(process.cwd(), "public", "images", "monsterlings", file))
    ? `/images/monsterlings/${file}`
    : null;
}
