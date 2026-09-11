/**
 * ตรวจไฟล์ข้อมูลทั้งหมดก่อนขึ้นเว็บ — รันใน CI ทุก PR ถ้าไม่ผ่าน build จะ fail
 *
 *   1. ทุกไฟล์ผ่าน zod schema ของหมวดตัวเอง (รวมถึงคำศัพท์ต้องอยู่ใน vocabulary.json)
 *   2. id ตรงกับชื่อไฟล์ และไม่ซ้ำกันในหมวดเดียวกัน
 *   3. ทุก id ที่อ้างถึงข้ามหมวดมีอยู่จริง
 *   4. ไฟล์รูปที่ระบุไว้มีอยู่จริงใน public/images/
 *   5. pipeline ใน formula.json ไม่มีขั้นที่โค้ดยังทำไม่ได้
 *
 * คำเตือน (ไม่ทำให้ fail) จะถูกสรุปไว้ท้ายผล เช่น ช่องที่ยังไม่มีภาษาไทย
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { SCHEMAS, equipmentSet, monsterDexEntry, type Collection } from "../src/lib/schema/entities";
import { FORMULA, IMPLEMENTED_STEPS } from "../src/lib/formula";

const ROOT = process.cwd();
const DATA = join(ROOT, "data");
const IMAGES = join(ROOT, "public", "images");

const errors: string[] = [];
const warnings: string[] = [];
const ids: Record<string, Set<string>> = {};
let fileCount = 0;

function fail(where: string, msg: string) { errors.push(`${where}: ${msg}`); }
function warn(where: string, msg: string) { warnings.push(`${where}: ${msg}`); }

function readJson(path: string, where: string): unknown | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(where, `JSON ไม่ถูกต้อง — ${(e as Error).message}`);
    return undefined;
  }
}

function zodIssues(where: string, error: z.ZodError) {
  for (const issue of error.issues) {
    const at = issue.path.length ? issue.path.join(".") : "(ราก)";
    fail(where, `${at} — ${issue.message}`);
  }
}

/** เก็บทุกช่องข้อความที่ยังไม่มีภาษาไทย เพื่อรายงานเป็นคำเตือน */
function countMissingThai(value: unknown, where: string, path: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => countMissingThai(v, where, [...path, String(i)]));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const obj = value as Record<string, unknown>;
  const looksLikeText = ("en" in obj || "th" in obj) && Object.keys(obj).every((k) => k === "en" || k === "th");
  if (looksLikeText && !obj.th) {
    warn(where, `${path.join(".") || "(ราก)"} ยังไม่มีภาษาไทย`);
    return;
  }
  for (const [k, v] of Object.entries(obj)) countMissingThai(v, where, [...path, k]);
}

// ---------- 1–2. schema + id ----------
const parsed: Record<string, Record<string, Record<string, unknown>>> = {};

for (const collection of Object.keys(SCHEMAS) as Collection[]) {
  const dir = join(DATA, collection);
  ids[collection] = new Set();
  parsed[collection] = {};
  if (!existsSync(dir)) { fail(`data/${collection}`, "ไม่พบโฟลเดอร์"); continue; }

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    fileCount += 1;
    const where = `data/${collection}/${file}`;
    const raw = readJson(join(dir, file), where);
    if (raw === undefined) continue;

    const result = SCHEMAS[collection].safeParse(raw);
    if (!result.success) { zodIssues(where, result.error); continue; }

    const doc = result.data as Record<string, unknown>;
    const id = doc.id as string;
    const stem = file.replace(/\.json$/, "");
    if (id !== stem) fail(where, `id "${id}" ไม่ตรงกับชื่อไฟล์ "${stem}"`);
    if (ids[collection].has(id)) fail(where, `id "${id}" ซ้ำกับไฟล์อื่นในหมวดเดียวกัน`);

    ids[collection].add(id);
    parsed[collection][id] = doc;
    countMissingThai(raw, where);

    const src = doc.source as { fieldsUnverified?: string[] } | undefined;
    if (src?.fieldsUnverified?.length) {
      warn(where, `ยังไม่ยืนยัน ${src.fieldsUnverified.length} ฟิลด์: ${src.fieldsUnverified.join(", ")}`);
    }
  }
}

// ---------- เซ็ตอุปกรณ์ (อยู่ใน meta) ----------
const setIds = new Set<string>();
const setsRaw = readJson(join(DATA, "meta", "sets.json"), "data/meta/sets.json");
if (Array.isArray(setsRaw)) {
  setsRaw.forEach((s, i) => {
    const where = `data/meta/sets.json[${i}]`;
    const r = equipmentSet.safeParse(s);
    if (!r.success) zodIssues(where, r.error);
    else {
      if (setIds.has(r.data.id)) fail(where, `id เซ็ต "${r.data.id}" ซ้ำ`);
      setIds.add(r.data.id);
    }
  });
} else if (setsRaw !== undefined) {
  fail("data/meta/sets.json", "ต้องเป็น array");
}

// ---------- สมุดภาพมอน ----------
const dexRaw = readJson(join(DATA, "meta", "monster-dex.json"), "data/meta/monster-dex.json") as
  | { regions?: Record<string, unknown>; entries?: unknown[] }
  | undefined;

if (dexRaw) {
  const regions = new Set(Object.keys(dexRaw.regions ?? {}));
  const seenNo = new Set<number>();
  let unassigned = 0;
  let truncated = 0;

  for (const [i, entry] of (dexRaw.entries ?? []).entries()) {
    const where = `data/meta/monster-dex.json[${i}]`;
    const r = monsterDexEntry.safeParse(entry);
    if (!r.success) { zodIssues(where, r.error); continue; }

    const e = r.data;
    if (seenNo.has(e.no)) fail(where, `เลข no ${e.no} ซ้ำ`);
    seenNo.add(e.no);
    if (!regions.has(e.region)) fail(where, `region "${e.region}" ไม่มีในรายการ regions`);
    // slug ที่ตั้งแล้วต้องมีไฟล์ Monsterling จริงรองรับ ไม่งั้นดัชนีจะชี้ไปที่ว่าง
    if (e.slug && !ids.monsterlings.has(e.slug)) {
      fail(where, `slug "${e.slug}" ยังไม่มีไฟล์ใน data/monsterlings/`);
    }
    if (!e.slug) unassigned += 1;
    if (e.nameTruncated) truncated += 1;
  }

  if (unassigned) warn("data/meta/monster-dex.json", `${unassigned} ตัวยังไม่ได้ตั้ง slug — รอชื่ออังกฤษทางการก่อน (ดู PLAN.md §13.1)`);
  if (truncated) warn("data/meta/monster-dex.json", `${truncated} ตัวชื่อถูกตัดในหน้าจอเกม ต้องแคปใหม่ให้เห็นชื่อเต็ม`);
}

// ---------- 3. อ้างอิงข้ามหมวด ----------
function checkRefs(where: string, refs: unknown, target: Collection | "sets", field: string) {
  const list = Array.isArray(refs) ? refs : refs === undefined ? [] : [refs];
  for (const ref of list) {
    if (typeof ref !== "string") continue;
    const pool = target === "sets" ? setIds : ids[target];
    if (!pool.has(ref)) fail(where, `${field} อ้างถึง "${ref}" ในหมวด ${target} แต่ไม่มีไฟล์นั้น`);
  }
}

for (const [id, doc] of Object.entries(parsed.characters ?? {})) {
  const where = `data/characters/${id}.json`;
  const rec = doc.recommended as Record<string, unknown> | undefined;
  if (rec) {
    checkRefs(where, rec.artifacts, "artifacts", "recommended.artifacts");
    checkRefs(where, rec.equipment, "equipment", "recommended.equipment");
    checkRefs(where, rec.monsterlings, "monsterlings", "recommended.monsterlings");
    checkRefs(where, rec.teammates, "characters", "recommended.teammates");
    checkRefs(where, rec.builds, "builds", "recommended.builds");
  }
}

for (const [id, doc] of Object.entries(parsed.artifacts ?? {})) {
  checkRefs(`data/artifacts/${id}.json`, doc.recommendedFor, "characters", "recommendedFor");
}

for (const [id, doc] of Object.entries(parsed.equipment ?? {})) {
  checkRefs(`data/equipment/${id}.json`, doc.setId, "sets", "setId");
}

for (const [id, doc] of Object.entries(parsed.builds ?? {})) {
  const where = `data/builds/${id}.json`;
  checkRefs(where, doc.characterId, "characters", "characterId");
  checkRefs(where, doc.artifacts, "artifacts", "artifacts");
  checkRefs(where, doc.equipment, "equipment", "equipment");
  checkRefs(where, doc.setIds, "sets", "setIds");
  checkRefs(where, doc.monsterlings, "monsterlings", "monsterlings");
  const food = doc.food as { entree?: string; side?: string } | undefined;
  if (food) {
    checkRefs(where, food.entree, "food", "food.entree");
    checkRefs(where, food.side, "food", "food.side");
  }
  for (const comp of (doc.teamComps as Array<{ members: string[] }> | undefined) ?? []) {
    checkRefs(where, comp.members, "characters", "teamComps.members");
  }
}

// ---------- 4. รูปภาพ ----------
for (const collection of Object.keys(SCHEMAS) as Collection[]) {
  for (const [id, doc] of Object.entries(parsed[collection] ?? {})) {
    const images = doc.images as Record<string, string> | undefined;
    if (!images) { warn(`data/${collection}/${id}.json`, "ยังไม่มีรูป"); continue; }
    for (const [variant, filename] of Object.entries(images)) {
      if (!filename) continue;
      if (!existsSync(join(IMAGES, collection, filename))) {
        fail(`data/${collection}/${id}.json`, `images.${variant} ชี้ไปที่ public/images/${collection}/${filename} แต่ไม่มีไฟล์นั้น`);
      }
    }
  }
}

// ---------- 5. สูตรดาเมจ ----------
const implemented = new Set<string>(IMPLEMENTED_STEPS);
for (const step of FORMULA.pipeline) {
  if (!implemented.has(step)) {
    fail("data/meta/formula.json", `pipeline มีขั้น "${step}" ที่ src/lib/formula.ts ยังไม่ได้ทำ`);
  }
}
const missing = Object.entries(FORMULA.constants).filter(([, v]) => v === null).map(([k]) => k);
if (missing.length) {
  warn("data/meta/formula.json", `ค่าคงที่ที่ยังไม่ยืนยัน: ${missing.join(", ")} — เครื่องคำนวณจะข้ามขั้นที่ต้องใช้ค่าเหล่านี้`);
}

// ---------- สรุป ----------
if (warnings.length) {
  console.warn(`คำเตือน ${warnings.length} รายการ:`);
  for (const w of warnings) console.warn(`  ! ${w}`);
  console.warn("");
}
if (errors.length) {
  console.error(`พบข้อผิดพลาด ${errors.length} รายการ:\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`ข้อมูลผ่านการตรวจทั้งหมด (${fileCount} ไฟล์, ${setIds.size} เซ็ต)`);
