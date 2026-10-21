/**
 * มอนสเตอร์ลิงตัวไหน "ใส่ลิงก์เชนได้" — คำนวณจากไฟล์ลิงก์เชน ไม่เก็บซ้ำในไฟล์มอน
 *
 * เหตุผล: ลิงก์เชนทุกใบชี้ไปที่ monsterlingId อยู่แล้ว ถ้าไปเก็บ linkable ไว้ใน
 * ไฟล์มอนด้วย วันหนึ่งสองที่จะไม่ตรงกันแล้วไม่มีใครรู้ว่าอันไหนถูก
 *
 * สำคัญ: "ไม่มีลิงก์เชนชี้มา" ไม่เท่ากับ "ใส่ลิงก์ไม่ได้" ตราบใดที่ยังไม่ยืนยันว่า
 * รายการลิงก์เชนในเกมแสดงครบทุกใบ (ดู LINK_CHAIN_LIST_IS_COMPLETE) จึงต้องมี
 * สามสถานะ ไม่ใช่สอง — ป้ายบนหน้าเว็บต้องแยก "ไม่ได้" ออกจาก "ยังไม่รู้"
 */
import type { LinkChain } from "./schema/entities";

/**
 * รายการลิงก์เชนในเกมแสดงครบทุกใบหรือไม่ (รวมใบที่ผู้เล่นยังไม่ได้คราฟต์)
 *
 * ยืนยันแล้วเมื่อ 2026-09-13 ว่ารายการที่ส่งมาครบทั้งหมด และมอนไม่ได้มีลิงก์เชน
 * กันทุกตัว ตั้งแต่นี้มอนที่ไม่มีลิงก์เชนชี้มาจึงได้สถานะ "no" ไม่ใช่ "unknown"
 */
export const LINK_CHAIN_LIST_IS_COMPLETE = true;

export type Linkable = "yes" | "no" | "unknown";

/** monsterlingId ทุกตัวที่มีลิงก์เชนชี้มา */
export function linkableIds(chains: Pick<LinkChain, "monsterlingId">[]): Set<string> {
  return new Set(chains.map((c) => c.monsterlingId));
}

/**
 * สถานะของมอนหนึ่งตัว
 * - yes     = มีลิงก์เชนชี้มา (ยืนยันแล้วจากข้อมูลจริง)
 * - no      = ไม่มีลิงก์เชนชี้มา และยืนยันแล้วว่ารายการในเกมครบ
 * - unknown = ไม่มีลิงก์เชนชี้มา แต่ยังไม่ยืนยันว่ารายการครบ
 */
/**
 * มอนที่เห็นการ์ดลิงก์เชนของมันในเกมแล้ว แต่ยังสร้างไฟล์ลิงก์เชนไม่ได้
 * (ชื่อถูกตัด หรือยังไม่ได้เปิดดูเงื่อนไขปรากฏตัว ซึ่งไฟล์บังคับต้องมี)
 *
 * ถ้าไม่มีรายการนี้ LINK_CHAIN_LIST_IS_COMPLETE จะทำให้มอนพวกนี้ได้ "no"
 * ทั้งที่เกมมีลิงก์เชนให้จริง — สร้างไฟล์ลิงก์เชนเมื่อไรให้ลบชื่อออกจากที่นี่
 */
const CHAIN_SEEN_NOT_RECORDED: ReadonlySet<string> = new Set([
  "colossus-alter", // "State-of-th..." (จอลิงก์เชนอังกฤษ 2026-10-21)
  "silbinator", // "Machine Gu..."
  "whitelon", // "Iron Saw Horn" — ชื่อเต็ม แต่ยังไม่เห็นเงื่อนไขปรากฏตัว
  "altus-raptor", // "Intricate St..."
]);

export function linkableOf(slug: string, ids: Set<string>): Linkable {
  if (ids.has(slug) || CHAIN_SEEN_NOT_RECORDED.has(slug)) return "yes";
  return LINK_CHAIN_LIST_IS_COMPLETE ? "no" : "unknown";
}

/** ป้ายที่จะแปะบนการ์ดมอน — unknown คืน null เพราะไม่ควรแปะป้ายที่ยังไม่รู้ */
export function linkableBadge(state: Linkable): { th: string; en: string } | null {
  if (state === "yes") return { th: "ใส่ลิงก์เชนได้", en: "Link Chain" };
  if (state === "no") return { th: "ใส่ลิงก์เชนไม่ได้", en: "No Link Chain" };
  return null;
}
