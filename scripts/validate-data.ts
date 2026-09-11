/**
 * ตรวจความถูกต้องของไฟล์ข้อมูลใน data/ ก่อนขึ้นเว็บ
 *
 * ตอนนี้ตรวจกฎพื้นฐานที่ใช้ได้กับทุก entity:
 *   1. ไฟล์ JSON ต้อง parse ผ่าน
 *   2. ต้องมีฟิลด์ `id` และตรงกับชื่อไฟล์ (jiwon.json -> "jiwon")
 *   3. ห้ามมี id ซ้ำภายในหมวดเดียวกัน
 *
 * ขั้นถัดไป (M1 ใน docs/PLAN.md): zod schema ต่อ entity, ตรวจว่า id ที่อ้างถึงกันมีอยู่จริง
 * และตรวจว่าไฟล์รูปที่ระบุไว้มีจริงใน public/images/
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");

const errors: string[] = [];
let fileCount = 0;

function listCollections(): string[] {
  try {
    return readdirSync(DATA_DIR).filter((name) =>
      statSync(join(DATA_DIR, name)).isDirectory(),
    );
  } catch {
    errors.push(`ไม่พบโฟลเดอร์ data/ ที่ ${DATA_DIR}`);
    return [];
  }
}

function validateCollection(collection: string): void {
  const dir = join(DATA_DIR, collection);
  const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
  const seen = new Map<string, string>();

  for (const file of files) {
    fileCount += 1;
    const path = `data/${collection}/${file}`;
    const slug = file.replace(/\.json$/, "");

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(dir, file), "utf8"));
    } catch (error) {
      errors.push(`${path}: JSON ไม่ถูกต้อง — ${(error as Error).message}`);
      continue;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      errors.push(`${path}: ต้องเป็น object ไม่ใช่ ${Array.isArray(parsed) ? "array" : typeof parsed}`);
      continue;
    }

    const id = (parsed as { id?: unknown }).id;
    if (typeof id !== "string" || id.length === 0) {
      errors.push(`${path}: ไม่มีฟิลด์ "id" หรือไม่ใช่ string`);
      continue;
    }
    if (id !== slug) {
      errors.push(`${path}: id "${id}" ไม่ตรงกับชื่อไฟล์ "${slug}"`);
    }

    const duplicate = seen.get(id);
    if (duplicate) {
      errors.push(`${path}: id "${id}" ซ้ำกับ ${duplicate}`);
    } else {
      seen.set(id, path);
    }
  }
}

for (const collection of listCollections()) {
  validateCollection(collection);
}

if (errors.length > 0) {
  console.error(`พบข้อผิดพลาด ${errors.length} รายการ:\n`);
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}

console.log(`ข้อมูลผ่านการตรวจทั้งหมด (${fileCount} ไฟล์)`);
