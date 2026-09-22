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
import { SCHEMAS, equipmentSet, gearMainStat, gearSubstat, monsterDexEntry, type Collection } from "../src/lib/schema/entities";
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

/** เก็บทุกช่องข้อความที่ยังขาดภาษาใดภาษาหนึ่ง เพื่อรายงานเป็นคำเตือน */
function countMissingLocale(value: unknown, where: string, path: string[] = []) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => countMissingLocale(v, where, [...path, String(i)]));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const obj = value as Record<string, unknown>;
  const looksLikeText = ("en" in obj || "th" in obj) && Object.keys(obj).every((k) => k === "en" || k === "th");
  if (looksLikeText && !obj.th) {
    warn(where, `${path.join(".") || "(ราก)"} ยังไม่มีภาษาไทย`);
    return;
  }
  if (looksLikeText && !obj.en) {
    warn(where, `${path.join(".") || "(ราก)"} ยังไม่มีภาษาอังกฤษ`);
    return;
  }
  for (const [k, v] of Object.entries(obj)) countMissingLocale(v, where, [...path, k]);
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
    countMissingLocale(raw, where);

    const src = doc.source as { fieldsUnverified?: string[] } | undefined;
    if (src?.fieldsUnverified?.length) {
      warn(where, `ยังไม่ยืนยัน ${src.fieldsUnverified.length} ฟิลด์: ${src.fieldsUnverified.join(", ")}`);
    }
  }
}

// ---------- เซ็ตอุปกรณ์ (อยู่ใน meta) ----------
const setIds = new Set<string>();
const setDocs: Record<string, unknown>[] = [];
const mainStatsRaw = readJson(join(DATA, "meta", "gear-main-stats.json"), "data/meta/gear-main-stats.json");
if (Array.isArray(mainStatsRaw)) {
  const seen = new Set<string>();
  mainStatsRaw.forEach((row, i) => {
    const where = `data/meta/gear-main-stats.json[${i}]`;
    const r = gearMainStat.safeParse(row);
    if (!r.success) {
      for (const issue of r.error.issues) fail(where, `${issue.path.join(".") || "(root)"}: ${issue.message}`);
      return;
    }
    // หนึ่งช่องต่อหนึ่งระดับต้องมีแถวเดียว ไม่งั้นหน้าเว็บไม่รู้จะเชื่ออันไหน
    const key = `${r.data.grade}/${r.data.slot}`;
    if (seen.has(key)) fail(where, `ซ้ำกับแถวก่อนหน้า: ${key}`);
    seen.add(key);
  });
} else {
  fail("data/meta/gear-main-stats.json", "ต้องเป็น array");
}

const subsRaw = readJson(join(DATA, "meta", "gear-substats.json"), "data/meta/gear-substats.json");
if (Array.isArray(subsRaw)) {
  const totals = new Map<string, number>();
  subsRaw.forEach((row, i) => {
    const where = `data/meta/gear-substats.json[${i}]`;
    const r = gearSubstat.safeParse(row);
    if (!r.success) {
      for (const issue of r.error.issues) fail(where, `${issue.path.join(".") || "(root)"}: ${issue.message}`);
      return;
    }
    const key = `${r.data.grade}/${r.data.stars}`;
    totals.set(key, (totals.get(key) ?? 0) + r.data.chancePercent);
  });
  // หน้าเว็บรวมคอลัมน์ "โอกาส" ของสองระดับเป็นช่องเดียว เพราะที่อ่านมาเท่ากันหมด
  // ถ้าวันหนึ่งไม่เท่า ต้องรู้ทันทีเพื่อแยกคอลัมน์ ไม่ใช่ปล่อยให้หน้าเว็บโกหก
  const chanceByOption = new Map<string, Map<string, number>>();
  for (const row of subsRaw) {
    const r = gearSubstat.safeParse(row);
    if (!r.success) continue;
    const option = `${r.data.stat}${r.data.damageType ? `/${r.data.damageType}` : ""}`;
    const perGrade = chanceByOption.get(option) ?? new Map<string, number>();
    perGrade.set(r.data.grade, r.data.chancePercent);
    chanceByOption.set(option, perGrade);
  }
  for (const [option, perGrade] of chanceByOption) {
    const values = [...new Set(perGrade.values())];
    if (values.length > 1) {
      warn("data/meta/gear-substats.json", `ออปชัน ${option} มีโอกาสไม่เท่ากันระหว่างระดับ (${values.join(" / ")}) — หน้าเว็บรวมคอลัมน์โอกาสไว้ ต้องแยกแล้ว`);
    }
  }

  // ตารางที่อ่านครบต้องรวมได้ 100 — ถ้าไม่ครบแปลว่าเลื่อนดูไม่สุดแล้วอ่านตกไปบางออปชัน
  for (const [key, total] of totals) {
    if (Math.abs(total - 100) > 0.5) {
      warn("data/meta/gear-substats.json", `โอกาสของ ${key} รวมได้ ${total}% ไม่ใช่ 100% — น่าจะอ่านตกบางออปชัน`);
    }
  }
} else {
  fail("data/meta/gear-substats.json", "ต้องเป็น array");
}

const setsRaw = readJson(join(DATA, "meta", "sets.json"), "data/meta/sets.json");
if (Array.isArray(setsRaw)) {
  setsRaw.forEach((s, i) => {
    const where = `data/meta/sets.json[${i}]`;
    const r = equipmentSet.safeParse(s);
    if (!r.success) zodIssues(where, r.error);
    else {
      if (setIds.has(r.data.id)) fail(where, `id เซ็ต "${r.data.id}" ซ้ำ`);
      setIds.add(r.data.id);
      // เซ็ตอยู่นอกลูปหมวด จึงต้องเรียกตรวจภาษาและเก็บไปนับ readIn เอง
      // ไม่งั้นเซ็ตที่มีภาษาเดียวจะผ่านไปเงียบ ๆ ทั้งที่ไฟล์หมวดอื่นโดนเตือน
      countMissingLocale(s, `${where} (${r.data.id})`);
      setDocs.push(r.data as Record<string, unknown>);
      const src = r.data.source as { fieldsUnverified?: string[] } | undefined;
      if (src?.fieldsUnverified?.length) {
        warn(`${where} (${r.data.id})`, `ยังไม่ยืนยัน ${src.fieldsUnverified.length} ฟิลด์: ${src.fieldsUnverified.join(", ")}`);
      }
    }
  });
} else if (setsRaw !== undefined) {
  fail("data/meta/sets.json", "ต้องเป็น array");
}

// ---------- สมุดภาพมอน ----------
const dexRaw = readJson(join(DATA, "meta", "monster-dex.json"), "data/meta/monster-dex.json") as
  | { entries?: unknown[] }
  | undefined;

const dexSlugs = new Map<string, string>();
const dexByKey = new Map<string, { slug: string | null; name: { th?: string; en?: string } }>();

if (dexRaw) {
  const seen = new Map<string, Set<number>>();
  let unassigned = 0;
  let truncated = 0;

  for (const [i, entry] of (dexRaw.entries ?? []).entries()) {
    const where = `data/meta/monster-dex.json[${i}]`;
    const r = monsterDexEntry.safeParse(entry);
    if (!r.success) { zodIssues(where, r.error); continue; }

    const e = r.data;
    const book = seen.get(e.book) ?? new Set<number>();
    if (book.has(e.no)) fail(where, `สมุด "${e.book}" มีเลข no ${e.no} ซ้ำ`);
    book.add(e.no);
    seen.set(e.book, book);
    dexByKey.set(`${e.book}:${e.no}`, { slug: e.slug, name: e.name });

    // slug คือ id ที่ "จอง" ไว้ ยังไม่ต้องมีไฟล์ Monsterling รองรับ
    // แต่ห้ามซ้ำกัน เพราะมันคือ URL ของเว็บ
    if (e.slug) {
      const owner = dexSlugs.get(e.slug);
      if (owner) fail(where, `slug "${e.slug}" ซ้ำกับ ${owner}`);
      else dexSlugs.set(e.slug, `${e.book} No.${e.no}`);
    } else {
      unassigned += 1;
    }
    if (e.truncated?.length) truncated += 1;
  }

  const summary: string[] = [];
  for (const [book, nos] of seen) {
    const maxNo = Math.max(...nos);
    summary.push(`${book} ${nos.size} (สูงสุด No.${maxNo})`);
    // เลขที่หายไปกลางเล่มแปลว่าแคปตกหน้า ไม่ใช่เกมข้ามเลข
    const gaps = Array.from({ length: maxNo }, (_, i) => i + 1).filter((n) => !nos.has(n));
    if (gaps.length) warn("data/meta/monster-dex.json", `สมุด "${book}" ขาดเลข: ${gaps.join(", ")}`);
  }
  console.log(`สมุดภาพมอน: ${summary.join(" · ")}`);

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

type SkillShape = {
  desc?: { th?: string; en?: string };
  values?: { line?: number }[];
};

/** นับท่อนของคำอธิบายแบบเดียวกับที่หน้าเว็บตัด — ต้องเป็นกฎเดียวกันเป๊ะ */
function splitDesc(desc: string | undefined): number {
  if (!desc) return 0;
  return desc.split("/").map((s) => s.trim()).filter((s) => s !== "").length;
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

  // คำอธิบายสกิลถูกคั่นด้วย "/" และหน้าเว็บใช้ตัวคั่นนั้นแยกเป็นกลไกทีละท่อน
  // ถ้าสองภาษาคั่นไม่เท่ากัน แปลว่าอ่านมาตกไปท่อนหนึ่ง หรือตัวคั่นไม่ใช่โครงของเกมจริง
  // ทั้งสองกรณีต้องรู้ตัวตรงนี้ ไม่ใช่ไปเจอตอนหน้าเว็บจับคู่ตัวเลขผิดท่อน
  const skills = (doc.skills ?? {}) as Record<string, SkillShape | undefined>;
  for (const [slot, skill] of Object.entries(skills)) {
    if (!skill) continue;
    const counts = (["th", "en"] as const).map((lang) => ({
      lang,
      n: splitDesc(skill.desc?.[lang]),
    }));
    const [th, en] = counts;
    if (th.n > 0 && en.n > 0 && th.n !== en.n) {
      fail(where, `skills.${slot}.desc คั่นด้วย "/" ไม่เท่ากัน: ไทย ${th.n} ท่อน อังกฤษ ${en.n} ท่อน`);
    }
    const lines = Math.max(th.n, en.n);
    for (const [i, value] of (skill.values ?? []).entries()) {
      if (value.line !== undefined && value.line > lines) {
        fail(
          where,
          `skills.${slot}.values[${i}].line = ${value.line} แต่คำอธิบายมีแค่ ${lines} ท่อน`,
        );
      }
    }
  }
}

for (const [id, doc] of Object.entries(parsed.monsterlings ?? {})) {
  const where = `data/monsterlings/${id}.json`;
  // ตัวเลขเอฟเฟกต์สายพันธุ์ขึ้นกับแรงของมอนแต่ละตัว เว็บจะโชว์เฉพาะค่าจากตัวสีทอง
  const grade = doc.effectsRank as string | undefined;
  const effects = (doc.speciesEffects as Array<{ value?: number }> | undefined) ?? [];
  if (effects.some((e) => e.value !== undefined) && grade !== "gold") {
    warn(where, `ค่าเอฟเฟกต์สายพันธุ์อ่านมาจากมอนแรง "${grade ?? "ไม่ระบุ"}" ไม่ใช่สีทอง — ยังใช้แสดงบนเว็บไม่ได้`);
  }
  const missing = effects.filter((e) => e.value === undefined).length;
  if (missing) warn(where, `เอฟเฟกต์สายพันธุ์ ${missing} ข้อยังไม่มีตัวเลข — ต้องแคปจากมอนสีทอง`);
  // ตอนบันทึกครั้งแรก condition มีช่องเดียวสำหรับ "ศัตรู" จึงแยกไม่ออกว่า
  // ศัตรูที่เขียนไว้คือ "ตัวที่ต้องไปตี" หรือ "ตัวที่ผลไปลง"
  // เอฟเฟกต์ที่นับจำนวนครั้ง/จำนวนตัวคือกลุ่มที่คำตอบต่างกันจริง — ต้องดูจอซ้ำ
  const unsplit = (doc.speciesEffects as Array<{ condition?: Record<string, unknown> }>).filter((e) => {
    const c = e.condition;
    if (!c) return false;
    const counts = c.hitCount !== undefined || c.killCount !== undefined;
    const scopeSide = c.enemyType !== undefined || c.vsBoss !== undefined;
    const triggerSide = c.triggerEnemyType !== undefined || c.triggerVsBoss !== undefined;
    // ดูจอแล้วและคำนั้นอยู่ฝั่งผลจริง — ไม่ต้องเตือนอีก (ดูคอมเมนต์ที่ enemyScopeVerified)
    if (c.enemyScopeVerified === true) return false;
    return counts && scopeSide && !triggerSide;
  }).length;
  if (unsplit) {
    warn(where, `${unsplit} ข้อยังไม่ได้แยกว่าเงื่อนไขศัตรูอยู่ฝั่งกระตุ้นหรือฝั่งผล — ต้องดูจอซ้ำแล้วย้ายไป triggerEnemyType/triggerVsBoss ถ้าเป็นฝั่งกระตุ้น`);
  }
  const dex = doc.dex as { book: string; no: number } | undefined;
  if (!dex) continue;
  const entry = dexByKey.get(`${dex.book}:${dex.no}`);
  if (!entry) {
    fail(where, `dex ชี้ไปที่ ${dex.book} No.${dex.no} แต่ไม่มีรายการนั้นในสมุดภาพมอน`);
  } else if (entry.slug && entry.slug !== id) {
    fail(where, `สมุดภาพมอนจอง id "${entry.slug}" ไว้ให้ ${dex.book} No.${dex.no} แต่ไฟล์นี้ใช้ id "${id}"`);
  } else {
    // ชื่อต้องตรงกับสมุดภาพมอน ซึ่งเป็นแหล่งเดียวของชื่อมอน
    const name = doc.name as Record<string, string>;
    for (const lang of ["th", "en"] as const) {
      const want = entry.name?.[lang];
      if (want && name[lang] && name[lang] !== want) {
        fail(where, `name.${lang} = "${name[lang]}" แต่สมุดภาพมอนเก็บไว้ว่า "${want}"`);
      }
    }
  }
}

for (const [id, doc] of Object.entries(parsed["link-chains"] ?? {})) {
  const where = `data/link-chains/${id}.json`;
  const ref = doc.monsterlingId as string;
  // เทียบกับ slug ที่สมุดภาพมอนจองไว้ ไม่ใช่ไฟล์ใน data/monsterlings/ ซึ่งยังไม่มี
  if (!dexSlugs.has(ref)) {
    fail(where, `monsterlingId "${ref}" ไม่ตรงกับ slug ไหนในสมุดภาพมอน`);
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
/** ลิงก์เชนไม่มีไอคอนของตัวเอง — ใช้ป้ายบนการ์ดมอนแทน (PLAN §13.8) */
const NO_IMAGES: ReadonlySet<string> = new Set(["link-chains"]);
for (const collection of Object.keys(SCHEMAS) as Collection[]) {
  if (NO_IMAGES.has(collection)) continue;
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
// ---------- สรุปว่าอ่านมาจากจอภาษาอะไรบ้าง ----------
// ไม่ใช่ error และไม่ใช่คำเตือน เป็นแค่ตัวเลขให้เห็นว่ายังเหลือของที่ยืนยันข้างเดียวเท่าไร
{
  const counts = { both: 0, th: 0, en: 0, unknown: 0 };
  const everything = [...Object.values(parsed).flatMap((c) => Object.values(c)), ...setDocs];
  {
    for (const doc of everything) {
      const read = (doc.source as { readIn?: string[] } | undefined)?.readIn;
      if (!read) counts.unknown += 1;
      else if (read.includes("th") && read.includes("en")) counts.both += 1;
      else if (read.includes("th")) counts.th += 1;
      else counts.en += 1;
    }
  }
  console.log(
    `อ่านจากจอ: สองภาษา ${counts.both} · ไทยอย่างเดียว ${counts.th} · ` +
      `อังกฤษอย่างเดียว ${counts.en} · ยังไม่ได้บันทึก ${counts.unknown}`,
  );
}

console.log(`ข้อมูลผ่านการตรวจทั้งหมด (${fileCount} ไฟล์, ${setIds.size} เซ็ต)`);
