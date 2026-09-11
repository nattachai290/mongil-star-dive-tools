/**
 * ตัดรูปมอนออกจากภาพแคปหน้า Monster Codex ทีละ 8 ตัวต่อภาพ
 *
 * วิธีใช้
 *   1. แคปหน้า Monster Codex เต็มจอ (ภาพไหนก็ได้ที่เห็น 2 แถวเต็ม = 8 ใบ)
 *   2. ตั้งชื่อไฟล์เป็น "เลขของใบแรกในภาพ" เช่น 40.png หมายถึงภาพนั้นเริ่มที่ No.40
 *      วางไว้ใน assets-src/codex/
 *   3. npm run crop:codex -- --preview    ตรวจว่ากรอบตรงไหม (ได้ไฟล์ใน assets-src/preview/)
 *   4. npm run crop:codex                 ตัดจริงลง public/images/monsterlings/
 *
 * ชื่อไฟล์ที่ได้มาจาก slug ในสมุดภาพมอน ไม่ได้ตั้งเอง เลยไม่มีทางหลุดจากข้อมูล
 * ตัวที่ยังไม่มี slug (ยังไม่ได้ชื่ออังกฤษ) จะถูกข้ามพร้อมบอกเหตุผล
 *
 * ไฟล์นี้เป็น .mts เพราะ sharp เป็น ESM-only — ถ้าเปลี่ยนเป็น .ts จะรันไม่ได้
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";

type CropConfig = {
  referenceWidth: number;
  box: { width: number; height: number };
  columnsX: number[];
  rowsY: number[];
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
const perSheet = config.columnsX.length * config.rowsY.length;

const slugByNo = new Map<number, string>();
for (const e of dex.entries) if (e.book === "field" && e.slug) slugByNo.set(e.no, e.slug);

if (!existsSync(INPUT)) {
  console.error(`ไม่พบโฟลเดอร์ ${INPUT} — สร้างแล้ววางภาพแคปไว้ในนั้นก่อน`);
  process.exit(1);
}

const sheets = readdirSync(INPUT).filter((f) => /^\d+\.(png|jpg|jpeg)$/i.test(f));
if (sheets.length === 0) {
  console.error(`ไม่มีไฟล์ที่ตั้งชื่อเป็นตัวเลขใน ${INPUT} (เช่น 40.png)`);
  process.exit(1);
}

mkdirSync(preview ? PREVIEW : OUTPUT, { recursive: true });

let written = 0;
const skipped: string[] = [];
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

for (const file of sheets.sort((a, b) => parseInt(a, 10) - parseInt(b, 10))) {
  const startNo = parseInt(basename(file), 10);
  const path = join(INPUT, file);
  const meta = await sharp(path).metadata();
  const width = meta.width ?? config.referenceWidth;
  // ภาพกว้างไม่เท่า 1920 ก็ใช้ได้ พิกัดถูกย่อ/ขยายตามอัตราส่วน
  const k = width / config.referenceWidth;
  const s = (n: number) => Math.round(n * k);

  let i = 0;
  for (const y of config.rowsY) {
    for (const x of config.columnsX) {
      const no = startNo + i;
      i += 1;
      const slug = slugByNo.get(no);
      if (!slug) {
        skipped.push(`No.${no} (ยังไม่มี slug — รอชื่ออังกฤษ)`);
        continue;
      }
      const pipeline = sharp(path)
        .extract({ left: s(x), top: s(y), width: s(config.box.width), height: s(config.box.height) })
        .resize(config.output.size, config.output.size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        });

      const buf = await (preview ? pipeline.png() : pipeline.webp({ quality: config.output.quality })).toBuffer();
      await sharp(buf).toFile(join(preview ? PREVIEW : OUTPUT, preview ? `${no}-${slug}.png` : `${slug}-icon.webp`));
      if (await looksGrey(buf)) maybeSilhouette.push(`No.${no} ${slug}`);
      written += 1;
    }
  }
  console.log(`${file}: No.${startNo}–${startNo + perSheet - 1}`);
}

console.log(`\nตัดแล้ว ${written} รูป -> ${preview ? PREVIEW : OUTPUT}`);
if (skipped.length) {
  console.log(`ข้าม ${skipped.length} ตัว:`);
  for (const line of skipped) console.log(`  - ${line}`);
}
if (maybeSilhouette.length) {
  console.log(`\nเกือบไม่มีสี ${maybeSilhouette.length} รูป — น่าจะเป็นเงาของมอนที่ยังจับไม่ครบ ให้จับครบแล้วแคปใหม่:`);
  for (const line of maybeSilhouette) console.log(`  ? ${line}`);
  console.log("  (มอนบางตัวสีเทาจริง ๆ ก็ติดรายการนี้ได้ ดูรูปก่อนตัดสิน)");
}
if (preview) console.log("\nเปิดดูใน assets-src/preview/ ว่ากรอบตรงไหม ถ้าเบี้ยวแก้ตัวเลขใน assets-src/codex-crop.json");
