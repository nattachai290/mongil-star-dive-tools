/**
 * ตัดรูปมอนออกจากภาพแคปหน้า Monster Codex ทีละ 8 ตัวต่อภาพ
 *
 * วิธีใช้
 *   1. แคปหน้า Monster Codex เต็มจอ (ภาพไหนก็ได้ที่เห็น 2 แถวเต็ม = 8 ใบ)
 *   2. ตั้งชื่อไฟล์เป็น "เลขบนการ์ดซ้ายบนสุดของภาพนั้น" — อ่านจากในภาพได้เลย
 *      เช่น ภาพที่การ์ดซ้ายบนเขียน No.40 ให้ตั้งชื่อ 40.png
 *      ไม่ใช่ลำดับภาพ! ภาพที่สองมักเป็น 9.png ไม่ใช่ 2.png
 *      วางไว้ใน assets-src/codex/
 *      สมุดเล่มอื่นใส่ชื่อเล่มนำหน้า เช่น event-1.png, legendary-1.png
 *   3. npm run crop:codex -- --preview    ตรวจว่ากรอบตรงไหม (ได้ไฟล์ใน assets-src/preview/)
 *   4. npm run crop:codex                 ตัดจริงลง public/images/monsterlings/
 *
 * ชื่อไฟล์ที่ได้มาจาก slug ในสมุดภาพมอน ไม่ได้ตั้งเอง เลยไม่มีทางหลุดจากข้อมูล
 * ตัวที่ยังไม่มี slug (ยังไม่ได้ชื่ออังกฤษ) จะถูกข้ามพร้อมบอกเหตุผล
 *
 * ไฟล์นี้เป็น .mts เพราะ sharp เป็น ESM-only — ถ้าเปลี่ยนเป็น .ts จะรันไม่ได้
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

/** เลื่อนกรอบทั้งชุด หน่วยเป็น px ของภาพกว้าง referenceWidth — ใส่เฉพาะทิศที่ใช้ก็ได้ */
type Shift = { up?: number; down?: number; left?: number; right?: number };
type CropConfig = {
  referenceWidth: number;
  box: { width: number; height: number };
  columnsX: number[];
  rowsY: number[];
  /** เลื่อนทุกภาพ — แก้ตรงนี้แทนการไล่ลบเลขใน columnsX / rowsY */
  shift?: Shift;
  /** เลื่อนเพิ่มเฉพาะภาพ เช่น { "183.png": { "up": 15 } } บวกต่อจาก shift */
  shiftBySheet?: Record<string, Shift>;
  output: { size: number; quality: number };
};
type DexEntry = { book: string; no: number; slug: string | null };

const ROOT = process.cwd();
const INPUT = join(ROOT, "assets-src", "codex");
const OUTPUT = join(ROOT, "public", "images", "monsterlings");
const PREVIEW = join(ROOT, "assets-src", "preview");

const readJson = <T,>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const config = readJson<CropConfig>(join(ROOT, "assets-src", "codex-crop.json"));
const dex = readJson<{ entries: DexEntry[] }>(join(ROOT, "data", "meta", "monster-dex.json"));

const preview = process.argv.includes("--preview");

/**
 * แปลง { up, down, left, right } เป็นระยะเลื่อน dx, dy
 * พิมพ์ทิศผิด (เช่น "upp") ต้องหยุด ไม่งั้นกรอบไม่ขยับแล้วจะงงว่าทำไม
 */
const SHIFT_KEYS = new Set(["up", "down", "left", "right"]);
function toOffset(shift: Shift | undefined, where: string): { dx: number; dy: number } {
  if (!shift) return { dx: 0, dy: 0 };
  for (const [k, v] of Object.entries(shift)) {
    if (k.startsWith("_")) continue;
    if (!SHIFT_KEYS.has(k)) {
      console.error(`${where}: ไม่รู้จักทิศ "${k}" — ใช้ได้แค่ up / down / left / right`);
      process.exit(1);
    }
    if (typeof v !== "number" || !Number.isFinite(v)) {
      console.error(`${where}.${k} ต้องเป็นตัวเลข (ได้ ${JSON.stringify(v)})`);
      process.exit(1);
    }
  }
  return {
    dx: (shift.right ?? 0) - (shift.left ?? 0),
    dy: (shift.down ?? 0) - (shift.up ?? 0),
  };
}
const globalShift = toOffset(config.shift, "shift");
function describeShift(dx: number, dy: number): string {
  const parts: string[] = [];
  if (dy) parts.push(dy < 0 ? `ขึ้น ${-dy}` : `ลง ${dy}`);
  if (dx) parts.push(dx < 0 ? `ซ้าย ${-dx}` : `ขวา ${dx}`);
  return parts.join(" ");
}
// ชื่อภาพใน shiftBySheet ที่ไม่มีอยู่จริง = พิมพ์ชื่อไฟล์ผิด กรอบจะไม่ขยับโดยไม่มีใครรู้
for (const name of Object.keys(config.shiftBySheet ?? {})) {
  if (!name.startsWith("_") && !existsSync(join(INPUT, name))) {
    console.warn(`⚠ shiftBySheet มี "${name}" แต่ไม่มีไฟล์นี้ใน assets-src/codex/ — ชื่อตรงกันไหม`);
  }
}
const perSheet = config.columnsX.length * config.rowsY.length;

// คีย์เป็น book+no เพราะแต่ละเล่มเริ่มนับ No.1 ใหม่ เลขอย่างเดียวชี้ตัวไม่ได้
const dexKey = (book: string, no: number) => `${book}:${no}`;
const slugByKey = new Map<string, string | null>();
for (const e of dex.entries) slugByKey.set(dexKey(e.book, e.no), e.slug);

// assets-src/ ไม่ถูก commit (มีแต่ไฟล์ตั้งค่า) โฟลเดอร์นี้จึงไม่มีหลัง clone
if (!existsSync(INPUT)) {
  mkdirSync(INPUT, { recursive: true });
  console.log(`สร้างโฟลเดอร์ ${INPUT} ให้แล้ว — วางภาพแคปไว้ในนั้นแล้วรันใหม่`);
  process.exit(0);
}

// 40.png = สมุดหลักเริ่มที่ No.40 · event-1.png = สมุดกิจกรรมเริ่มที่ No.1
const SHEET_NAME = /^(?:(field|legendary|event)-)?(\d+)\.(?:png|jpe?g)$/i;
const sheets = readdirSync(INPUT).filter((f) => SHEET_NAME.test(f));
if (sheets.length === 0) {
  console.error(`ไม่มีไฟล์ที่ตั้งชื่อถูกแบบใน ${INPUT} — ต้องเป็น 40.png หรือ event-1.png`);
  process.exit(1);
}

mkdirSync(preview ? PREVIEW : OUTPUT, { recursive: true });

let written = 0;
const skipped: string[] = [];
/** slug -> ภาพที่เขียนไฟล์นั้น ใช้ดูว่ามีภาพไหนตัดทับกัน */
const writtenBy = new Map<string, string>();
const overlaps: string[] = [];
const maybeSilhouette: string[] = [];

/**
 * มอนที่ยังจับไม่ครบ การ์ดในเกมจะโชว์เป็นเงาสีเทา ครอปออกมาก็ได้เงา
 * เช็คด้วยการดูว่าสามช่องสี R G B ใกล้กันแค่ไหน — ใกล้กันมาก = แทบไม่มีสี
 * เป็นแค่การเตือน ไม่ใช่คำตัดสิน เพราะมอนบางตัวสีเทาจริง ๆ (เช่น Ashen Mask)
 */
const GREY_THRESHOLD = 10;
async function looksGrey(buf: Buffer): Promise<boolean> {
  const { channels } = await sharp(buf).stats();
  const [r, g, b] = channels.slice(0, 3).map((c) => c.mean);
  return Math.max(r, g, b) - Math.min(r, g, b) < GREY_THRESHOLD;
}

/**
 * ภาพซ้ำกันเป๊ะ ๆ ไม่มีวันถูกต้อง — หนึ่งภาพมีมอนแค่ 8 ตัว คัดลอกภาพเดิมกี่ไฟล์
 * ก็ยังได้มอน 8 ตัวเดิม แต่จะถูกเซฟทับด้วยชื่อของมอนตัวอื่น = รูปผิดแบบดูไม่ออก
 * จึงหยุดตั้งแต่ยังไม่ตัด
 */
const byHash = new Map<string, string[]>();
for (const file of sheets) {
  const hash = createHash("sha1").update(readFileSync(join(INPUT, file))).digest("hex");
  byHash.set(hash, [...(byHash.get(hash) ?? []), file]);
}
const duplicates = [...byHash.values()].filter((group) => group.length > 1);
if (duplicates.length) {
  console.error("หยุดก่อน — เจอภาพที่เนื้อในเหมือนกันเป๊ะ:\n");
  for (const group of duplicates) console.error(`  ${group.join(" = ")}`);
  console.error("\nหนึ่งภาพมีมอนแค่ 8 ตัว คัดลอกภาพเดิมไม่ได้ทำให้ได้มอนเพิ่ม");
  console.error("ถ้าตัดต่อ รูปมอนตัวเดิมจะถูกเซฟเป็นชื่อของมอนตัวอื่น = รูปผิดโดยดูไม่ออก");
  console.error("ต้องแคปหลายภาพโดยเลื่อนหน้าจอไปคนละตำแหน่ง ภาพละ 8 ตัว");
  process.exit(1);
}

const parsed = sheets.map((file) => {
  const [, book, no] = SHEET_NAME.exec(file)!;
  return { file, book: (book ?? "field").toLowerCase(), startNo: parseInt(no, 10) };
});

for (const { file, book, startNo } of parsed.sort((a, b) => a.book.localeCompare(b.book) || a.startNo - b.startNo)) {
  const path = join(INPUT, file);
  const meta = await sharp(path).metadata();
  const width = meta.width ?? config.referenceWidth;
  // ภาพกว้างไม่เท่า 1920 ก็ใช้ได้ พิกัดถูกย่อ/ขยายตามอัตราส่วน
  const k = width / config.referenceWidth;
  const s = (n: number) => Math.round(n * k);
  const own = toOffset(config.shiftBySheet?.[file], `shiftBySheet["${file}"]`);
  const dx = globalShift.dx + own.dx;
  const dy = globalShift.dy + own.dy;
  const imgW = meta.width ?? 0;
  const imgH = meta.height ?? 0;

  let i = 0;
  for (const y of config.rowsY) {
    for (const x of config.columnsX) {
      const no = startNo + i;
      i += 1;
      const key = dexKey(book, no);
      // ช่องที่เลยท้ายเล่ม (เช่นภาพสุดท้ายของสมุดหลักที่มีแค่ 5 ใบ) ไม่ใช่ของเสีย ข้ามเงียบ ๆ ไม่ได้
      if (!slugByKey.has(key)) {
        skipped.push(`${book} No.${no} — ไม่มีในสมุด (ช่องว่างท้ายภาพ)`);
        continue;
      }
      const slug = slugByKey.get(key);
      if (!slug) {
        skipped.push(`${book} No.${no} — ยังไม่มี slug (รอชื่ออังกฤษ)`);
        continue;
      }
      const left = s(x + dx);
      const top = s(y + dy);
      const bw = s(config.box.width);
      const bh = s(config.box.height);
      // เลื่อนมากไปจนกรอบหลุดขอบภาพ sharp จะโยน error ที่อ่านไม่รู้เรื่อง — บอกเองดีกว่า
      if (left < 0 || top < 0 || (imgW && left + bw > imgW) || (imgH && top + bh > imgH)) {
        console.error(
          `${file}: กรอบของ No.${no} หลุดขอบภาพ (เลื่อนรวม ${describeShift(dx, dy)}) — ลดค่าใน shift / shiftBySheet`,
        );
        process.exit(1);
      }
      const pipeline = sharp(path)
        .extract({ left, top, width: bw, height: bh })
        .resize(config.output.size, config.output.size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });

      const buf = await (preview ? pipeline.png() : pipeline.webp({ quality: config.output.quality })).toBuffer();
      await sharp(buf).toFile(join(preview ? PREVIEW : OUTPUT, preview ? `${no}-${slug}.png` : `${slug}-icon.webp`));
      const before = writtenBy.get(slug);
      if (before && before !== file) overlaps.push(`${slug} — ${before} กับ ${file} ตัดทับกัน`);
      writtenBy.set(slug, file);
      if (await looksGrey(buf)) maybeSilhouette.push(`No.${no} ${slug}`);
      written += 1;
    }
  }
  const moved = dx || dy ? ` (เลื่อน ${describeShift(dx, dy)})` : "";
  console.log(`${file}: ${book} No.${startNo}–${startNo + perSheet - 1}${moved}`);
}

console.log(`\nตัดแล้ว ${written} ครั้ง ได้ไฟล์จริง ${writtenBy.size} รูป -> ${preview ? PREVIEW : OUTPUT}`);

// ---- รายงานว่าครอบคลุมมอนไปแล้วกี่ตัว ยังขาดใคร ----
// นี่คือตัวเลขที่ต้องดู ไม่ใช่จำนวนครั้งที่ตัด
const coveredByBook = new Map<string, Set<number>>();
for (const e of dex.entries) {
  if (e.slug && writtenBy.has(e.slug)) {
    const set = coveredByBook.get(e.book) ?? new Set<number>();
    set.add(e.no);
    coveredByBook.set(e.book, set);
  }
}
const totalByBook = new Map<string, number[]>();
for (const e of dex.entries) totalByBook.set(e.book, [...(totalByBook.get(e.book) ?? []), e.no]);

for (const [book, all] of totalByBook) {
  const covered = coveredByBook.get(book) ?? new Set<number>();
  if (covered.size === 0) continue;
  const missing = all.filter((n) => !covered.has(n));
  console.log(`  ${book}: ${covered.size}/${all.length} ตัว`);
  if (missing.length) {
    const shown = missing.slice(0, 20).join(", ");
    console.log(`    ยังขาด: ${shown}${missing.length > 20 ? ` … อีก ${missing.length - 20} ตัว` : ""}`);
  }
}

if (overlaps.length) {
  console.log(`\n⚠ มี ${overlaps.length} รูปที่ถูกภาพหลายใบตัดทับกัน:`);
  for (const line of overlaps.slice(0, 5)) console.log(`  ${line}`);
  if (overlaps.length > 5) console.log(`  … อีก ${overlaps.length - 5} รายการ`);
  console.log("  ถ้าเลื่อนทีละแถวแล้วภาพคาบกันก็ไม่เป็นไร ผลลัพธ์เหมือนกัน");
  console.log("  แต่ถ้าตั้งชื่อไฟล์เป็นลำดับภาพ (1,2,3...) แทนเลขการ์ดซ้ายบน ให้แก้ชื่อไฟล์ก่อน");
  console.log("  กติกา: ชื่อไฟล์ = เลขที่เขียนบนการ์ดซ้ายบนสุดของภาพนั้น");
}
if (skipped.length) {
  console.log(`ข้าม ${skipped.length} ตัว:`);
  for (const line of skipped) console.log(`  - ${line}`);
}
if (maybeSilhouette.length) {
  console.log(`\nเกือบไม่มีสี ${maybeSilhouette.length} รูป — น่าจะเป็นเงาของมอนที่ยังจับไม่ครบ ให้จับครบแล้วแคปใหม่:`);
  for (const line of maybeSilhouette) console.log(`  ? ${line}`);
  console.log("  (มอนบางตัวสีเทาจริง ๆ ก็ติดรายการนี้ได้ ดูรูปก่อนตัดสิน)");
}
if (preview) console.log("\nเปิดดูใน assets-src/preview/ ว่ากรอบตรงไหม ถ้าเบี้ยวใส่ตัวเลขใน shift (up / down / left / right) ของ assets-src/codex-crop.json");
