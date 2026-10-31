import {
  ARTIFACTS,
  EQUIPMENT,
  EQUIPMENT_SETS,
  FOOD,
  GEAR_MAIN_STATS,
  LINK_CHAINS,
  MONSTERLINGS,
  MONSTER_STAT_TIERS,
  TRAIT_POOL,
  characterById,
  minSubstat,
} from "./data";
import { FORMULA, computeDamage, proficiencyToPercent, type DamageInput } from "./formula";
import { chainAppears, chainEffects, topLevel } from "./link-chain-effects";
import type { Effect, LocalizedText } from "./schema/common";
import type { Artifact, BuildLoadout, BuildMember, Character } from "./schema/entities";

/**
 * ดาเมจรวมของทีม — สกิลครบ 1 รอบต่อตัว (ผู้เล่นเลือก 2026-10-24)
 * โจมตีพื้นฐานครบชุด + สกิลสับเปลี่ยน + สกิลพิเศษ + สกิลอัลติเมต คนละ 1 ครั้ง แล้วรวมทั้งทีม
 *
 * สมมติฐานที่ตั้งเอง (ต้องแสดงคู่กับตัวเลขเสมอ — ดู TEAM_ASSUMPTIONS):
 * - บัฟทุกตัวทำงานตลอดรอบ ไม่ว่าจะมีเงื่อนไขหรือเวลาแสดงผล
 * - ศัตรูเป็นบอส ไม่ได้ตีจุดอ่อน ไม่ได้หมดฤทธิ์ และไม่หักป้องกัน (ยังไม่มีข้อมูลศัตรู)
 * - ค่าหลักของอุปกรณ์คิดที่เลเวลสูงสุด · ค่ารองใช้ค่าต่ำสุดของระดับชิ้น (บิ้วเก็บแค่ชนิด)
 */

export const CYCLE_SKILLS = ["basic", "switch", "special", "ultimate"] as const;
export type CycleSkill = (typeof CYCLE_SKILLS)[number];

/** แถวตัวเลขที่นับเป็นดาเมจของรอบ — ตัดแถวที่เป็นบัฟ เวลา ท่าโต้กลับ และท่าที่ต้องมีเงื่อนไขพิเศษ */
const DMG_ROW = /DMG/;
const NOT_CYCLE_ROW =
  /Boost|Reduction|Ratio|Rate|Heal|Recovery|Max|Air Counter|Evasion Counter|Charge Attack|Tag-out|Support|Enhanced|Variant|Taken|Conversion|Cooldown|Duration/i;

export type SkillRow = { label: LocalizedText; value: number };
export type SkillDamage = {
  skill: CycleSkill;
  level: number;
  rows: SkillRow[];
  damageType: string;
  average: number;
};
export type MemberDamage = {
  characterId: string;
  skills: SkillDamage[];
  /** ดาเมจลิงก์เชน 1 ครั้งต่อรอบ (0 = ไม่โผล่ในรอบนี้ / ไม่มี) */
  chain: number;
  total: number;
};
export type TeamDamage = { members: MemberDamage[]; total: number };

export const TEAM_ASSUMPTIONS = [
  "บัฟทุกตัวทำงานตลอดรอบ (ไม่คิดเงื่อนไขและเวลาแสดงผล) · ยกเว้นบัฟที่ต้องหลบหลีกโต้กลับ ไม่นับเพราะเกิดนาน ๆ ที",
  "ศัตรูเป็นบอส · ตีจุดอ่อนตามที่บิ้วตั้ง (weaknessHit) · บัฟที่ติดเมื่อตีจุดอ่อนนับเฉพาะบิ้วที่ตีจุดอ่อน · ไม่หมดฤทธิ์ · ไม่หักป้องกัน",
  "ค่าหลักของอุปกรณ์คิดที่เลเวลสูงสุด · ค่ารองใช้ค่าต่ำสุด (เลเวล 1) ของระดับชิ้น",
  "ค่าพลังของมอน (ATK/DEF/HP) ตามชนิด บอส / ทั่วไป / ตำนาน · มอนทั่วไปบางตัวอนุมานจากการไม่มีลิงก์เชน",
  "ความชำนาญบทบาทคิดเป็นดาเมจเฉพาะบรอว์เลอร์ (ดาเมจปะทะ) — บทบาทอื่นสูตรยังไม่มี",
  "ยังไม่นับดาเมจต่อเนื่อง และสกิลสนับสนุน",
  "ลิงก์เชน: ดาเมจ 1 ครั้งต่อรอบ ถ้าเงื่อนไขปรากฏตัวเกิดในรอบสกิลหรือตีศัตรูที่ติดมึนงง (เฉพาะบิ้วที่ตั้งว่าทีมทำมึนงงไว) (ไม่นับหลบ/โต้กลับ/โดนตี) · ไม่บอกธาตุ = กายภาพ · เอฟเฟกต์เพิ่มเติมนับเฉพาะลดต้านทาน/ลดพลังป้องกัน/ดาเมจจุดอ่อน",
  "ลดคูลดาวน์สกิลพิเศษ: กดทุกครั้งที่คูลดาวน์หมด ดาเมจสกิลพิเศษ × (คูลดาวน์ตามจอ ÷ หลังลด) · หลายแหล่งบวกกัน (ผู้เล่นยืนยัน 2026-10-29) · ไม่หักเวลาตีพื้นฐาน",
];

/** เอฟเฟกต์พร้อมที่มา — gear = ค่าพลังของของที่ใส่ (ไม่ใช่บัฟ) */
export type Tagged = { effect: Effect; from: LocalizedText; gear: boolean };
type Sourced = Tagged;

function asEffect(stat: string, value: number, unit: string, extra: Partial<Effect> = {}): Effect {
  return { kind: "buff", stat, value, unit, target: "self", trigger: "passive", ...extra } as Effect;
}

const tag = (from: LocalizedText, gear: boolean) => (effect: Effect): Tagged => ({ effect, from, gear });
const join = (a: LocalizedText, suffix: LocalizedText): LocalizedText => ({
  th: `${a.th ?? a.en ?? ""} · ${suffix.th ?? suffix.en ?? ""}`,
  en: `${a.en ?? a.th ?? ""} · ${suffix.en ?? suffix.th ?? ""}`,
});

/**
 * รวมขั้นที่ใช้คิด — 5 ดาวส่วนใหญ่ผู้เล่นไม่มีรวมขั้น 5 จึงใช้รวมขั้น 1 (ผู้เล่นกำหนด 2026-10-24)
 * 4 ดาวเก็บแค่รวมขั้น 5 จึงใช้ขั้นนั้น
 */
export function artifactFusion(art: Artifact) {
  const byLevel = [...art.fusion].sort((a, b) => (a.level ?? a.artifactLevel) - (b.level ?? b.artifactLevel));
  if (art.stars === 5) return byLevel.find((f) => f.level === 1) ?? byLevel[0];
  return byLevel[byLevel.length - 1];
}

/** มอน 1 ช่อง → ค่าพลังตามชนิด + Trait (ค่าพลังของของ) และเอฟเฟกต์สายพันธุ์ (บัฟ) */
function monsterEffects(slot: BuildMember["monsterlings"][number]): Tagged[] {
  const mon = MONSTERLINGS.get(slot.id);
  const from = mon?.name ?? { en: slot.id };
  const out: Tagged[] = (mon?.speciesEffects ?? []).map(tag(from, false));
  // ค่าพลังของมอนบวกให้ตัวละครตอนใส่ — ตามแบบ (meta/monster-stat-tiers.json) เฉพาะตัวที่รู้แบบแล้ว
  const tier = MONSTER_STAT_TIERS.find((t) => t.id === mon?.statTier);
  if (tier) {
    for (const e of [asEffect("atk", tier.atk, "flat"), asEffect("def", tier.def, "flat"), asEffect("hp", tier.hp, "flat")])
      out.push(tag(from, true)(e));
  }
  for (const tr of slot.traits) {
    const t = TRAIT_POOL.pool.find((x) => x.id === tr.id);
    // ลดคูลดาวน์เก็บเป็น debuff ที่ตัวเอง (stat cooldown) — นอกนั้นรับเฉพาะบัฟ
    if (!t || (t.kind !== "buff" && t.stat !== "cooldown")) continue;
    const value = t.values[tr.grade as keyof typeof t.values];
    out.push(
      tag(from, true)(
        asEffect(t.stat, value, t.unit, {
          kind: t.kind,
          damageType: t.damageType,
          scopes: t.scopes,
          condition: t.vsBoss === undefined ? undefined : { vsBoss: t.vsBoss },
        }),
      ),
    );
  }
  return out;
}

/**
 * ตัวละครนี้ใช้สกิลพิเศษซ้ำให้โดนภายใน sec วินาทีได้ไหม
 * - สกิลที่กดต่อได้ (มีบรรทัด "ขั้น 2 ... เพิ่มคูลดาวน์" แบบ Ophelia, Yeonhwa) → ได้
 * - มีบรรทัด "คูลดาวน์" → ได้ถ้าไม่เกิน sec
 * - ไม่มีข้อมูลคูลดาวน์ → undefined (ไม่รู้ จึงไม่ตัดบัฟ)
 */
export function canRecastSpecial(char: Character, sec: number, cdCutPercent = 0): boolean | undefined {
  const rows = (char.skills?.special?.values ?? []).filter((v) => v.unit === "seconds");
  if (rows.some((v) => /Cooldown (Increase|Boost)/i.test(v.label.en ?? ""))) return true;
  const cd = rows.find((v) => /^Cooldown$/i.test(v.label.en ?? ""));
  const values = (cd?.scaling ?? []).filter((x): x is number => typeof x === "number");
  if (values.length === 0) return undefined;
  // คูลดาวน์หลังลด — Trait ลดคูลดาวน์ทำให้ใช้ซ้ำทันได้
  return Math.min(...values) * (1 - Math.min(cdCutPercent, 90) / 100) <= sec;
}

/** คูลดาวน์สกิลพิเศษตามจอ (บรรทัด "Cooldown") — สกิลที่กดต่อได้หรือไม่มีข้อมูล = undefined */
export function specialCooldown(char: Character): number | undefined {
  const rows = (char.skills?.special?.values ?? []).filter((v) => v.unit === "seconds");
  if (rows.some((v) => /Cooldown (Increase|Boost)/i.test(v.label.en ?? ""))) return undefined;
  const values = (rows.find((v) => /^Cooldown$/i.test(v.label.en ?? ""))?.scaling ?? []).filter(
    (x): x is number => typeof x === "number",
  );
  return values.length ? Math.min(...values) : undefined;
}

/** ลดคูลดาวน์สกิลพิเศษรวม (%) — หลายแหล่งบวกกันตรง ๆ เหมือนอัตราคริ (ผู้เล่นยืนยัน 2026-10-29) */
export function specialCooldownReduction(effects: Tagged[]): number {
  return effects
    .filter(({ effect: e }) => e.stat === "cooldown" && e.unit === "percent" && e.scopes?.includes("specialSkill"))
    .reduce((n, { effect: e }) => n + (e.value ?? 0), 0);
}

/**
 * แบบง่าย (ผู้เล่นเลือก 2026-10-29): กดสกิลพิเศษทุกครั้งที่คูลดาวน์หมด ท่าอื่นนับ 1 รอบเท่าเดิม
 * → ดาเมจสกิลพิเศษ × (คูลดาวน์ตามจอ ÷ คูลดาวน์หลังลด) · ไม่หักเวลาตีพื้นฐานที่เสียไป จึงสูงเกินจริงเล็กน้อย
 */
export function specialCastFactor(char: Character, effects: Tagged[]): number {
  const cd = specialCooldown(char);
  const cut = Math.min(specialCooldownReduction(effects), 90);
  return cd === undefined || cut <= 0 ? 1 : 1 / (1 - cut / 100);
}

/** ตัวละครนี้ตีได้แค่ธาตุของตัวเองกับกายภาพ */
const ownsType = (char: Character, t: string | undefined) => !t || t === char.element || t === "physical";

/**
 * เหตุที่เอฟเฟกต์นี้ใช้กับตัวละครนี้ไม่ได้ — undefined = ใช้ได้
 * - element: บัฟดาเมจธาตุอื่นให้ตัวเอง หรือต้องตีด้วยธาตุอื่นถึงจะติด (เช่น ดาเมจน้ำแข็งบนกาบิธาตุดิน)
 * - recast: ต้องใช้สกิลพิเศษซ้ำเร็วกว่าคูลดาวน์ของตัวละคร
 */
export type UnusableReason = "element" | "recast" | "attackElement" | "teamElement" | "evasionCounter";

/**
 * team (ถ้าส่งมา) = ตัวละครทั้งทีม — ใช้ตัดบัฟทีม/ดีบัฟศัตรูของธาตุที่ไม่มีใครในทีมใช้
 * เช่น โบนัสเซ็ตลดต้านทานลมในทีมที่ไม่มีตัวธาตุลม (ผู้เล่นสั่ง 2026-10-31)
 */
export function unusableReason(
  char: Character,
  e: Effect,
  cdCutPercent = 0,
  team?: Character[],
): UnusableReason | undefined {
  if (!ownsType(char, e.condition?.triggerDamageType)) return "element";
  // หลบหลีกโต้กลับเกิดนาน ๆ ที (ผู้เล่นบอก 2026-10-31) — ไม่นับบัฟที่ต้องหลบโต้กลับ
  if (e.trigger === "onEvasionCounter") return "evasionCounter";
  if (e.condition?.requiresAttackElementChange && !Object.values(char.skills ?? {}).some((sk) => sk?.changesBasicAttackTo)) {
    return "attackElement";
  }
  if (e.target === "self" && e.kind === "buff" && !ownsType(char, e.damageType)) return "element";
  const sec = e.condition?.specialRecastWithinSec;
  if (sec !== undefined && canRecastSpecial(char, sec, cdCutPercent) === false) return "recast";
  if (team && e.target !== "self") {
    if (e.damageType && !team.some((m) => ownsType(m, e.damageType))) return "teamElement";
    const te = e.condition?.teammateElement;
    if (te && !team.some((m) => m.element === te)) return "teamElement";
  }
  return undefined;
}

export const unreachable = (char: Character, e: Effect, cdCutPercent = 0) =>
  unusableReason(char, e, cdCutPercent) !== undefined;

/** ทุกเอฟเฟกต์ที่มาจากตัวละคร 1 ตัวและของที่ใส่ ณ ขั้นปลุกพลังนี้ */
function memberEffects(mem: BuildMember, char: Character, awaken: number): Tagged[] {
  const out: Tagged[] = [];
  // คิดจากชิ้นหลัก (ชิ้นแรก) — ที่เหลือเป็นตัวสำรอง
  const art = ARTIFACTS.find((a) => a.id === mem.artifacts?.[0]);
  if (art) {
    for (const s of art.stats) out.push(tag(art.name, true)(asEffect(s.stat, s.value, s.unit, { damageType: s.damageType })));
    out.push(...(artifactFusion(art)?.effects ?? []).map(tag(art.name, false)));
  }
  const counts = new Map<string, number>();
  for (const id of Object.values(mem.equipment)) {
    const piece = EQUIPMENT.find((e) => e.id === id);
    if (!piece) continue;
    if (piece.setId) counts.set(piece.setId, (counts.get(piece.setId) ?? 0) + 1);
    // ค่าหลักไม่สุ่ม ผูกกับช่อง + ระดับ (meta/gear-main-stats.json) — คิดที่เลเวลสูงสุด
    const main = GEAR_MAIN_STATS.find((g) => g.slot === piece.slot && g.grade === piece.grade && g.stars === piece.stars);
    if (main) out.push(tag(piece.name, true)(asEffect(main.stat, main.atMaxLevel, "flat")));
  }
  // ค่ารอง ชิ้นละ 4 — ใช้ค่าต่ำสุดของระดับชิ้นนั้น (ผู้เล่นสั่ง) · ต้านทานธาตุไม่มีผลกับดาเมจ จึงข้าม
  for (const [slot, keys] of Object.entries(mem.substats)) {
    const piece = EQUIPMENT.find((e) => e.id === mem.equipment[slot as keyof typeof mem.equipment]);
    if (!piece) continue;
    for (const key of keys ?? []) {
      const sub = minSubstat(key, piece.grade, piece.stars);
      if (sub && sub.stat !== "res") out.push(tag(piece.name, true)(asEffect(sub.stat, sub.min, sub.unit)));
    }
  }
  for (const [setId, n] of counts) {
    const set = EQUIPMENT_SETS.find((s) => s.id === setId);
    for (const b of set?.bonuses ?? [])
      if (b.pieces <= n) out.push(...b.effects.map(tag(join(set!.name, { th: `${b.pieces} ชิ้น`, en: `${b.pieces}-piece` }), false)));
  }
  for (const m of mem.monsterlings) out.push(...monsterEffects(m));
  if (mem.legendary) out.push(...monsterEffects(mem.legendary));
  for (const skill of Object.values(char.skills ?? {})) {
    if (skill) out.push(...(skill.effects ?? []).map(tag(join(char.name, skill.name), false)));
  }
  for (const a of char.awaken ?? []) {
    if (a.stage <= awaken) out.push(...a.effects.map(tag(join(char.name, a.name ?? { th: `ปลุกพลัง ${a.stage}`, en: `Awaken ${a.stage}` }), false)));
  }
  const cut = specialCooldownReduction(out);
  return out.filter((t) => !unreachable(char, t.effect, cut));
}

/**
 * ช่วงขั้นปลุกพลังที่ตัวคำนวณให้ผลเหมือนกัน — ขั้นที่มีแค่ข้อความ (ไม่มี effects / skillLevelBonus) ไม่เปลี่ยนตัวเลข
 * จึงรวมกับขั้นก่อนหน้า เช่น [[0,2],[3,4],[5,6]] (ผู้เล่นสั่ง 2026-10-31 "ถ้า 0-2 เหมือนกันเลือกไปก็ไม่เปลี่ยน")
 * extra: ขั้นที่ต้องแยกเพิ่ม เช่น ขั้นที่บิ้วจัดของชุดใหม่
 */
export function awakenGroups(char: Character | undefined, extra: number[] = []): [number, number][] {
  const breaks = new Set(extra.filter((s) => s > 0 && s <= 6));
  for (const a of char?.awaken ?? []) if (a.effects.length > 0 || a.skillLevelBonus) breaks.add(a.stage);
  const starts = [0, ...[...breaks].sort((x, y) => x - y)];
  return starts.map((s, i) => [s, (starts[i + 1] ?? 7) - 1]);
}

function skillLevel(char: Character, awaken: number): number {
  return 12 + (char.awaken ?? []).filter((a) => a.stage <= awaken).reduce((n, a) => n + (a.skillLevelBonus ?? 0), 0);
}

/** ค่าที่เลเวลนั้น ถ้าไม่มีให้ใช้เลเวลต่ำกว่าที่ใกล้ที่สุด แล้วค่อยสูงกว่า — บอกเลเวลที่ใช้จริงกลับไปด้วย */
function valueAt(scaling: (number | null)[], level: number): { value: number; level: number } | null {
  for (let l = Math.min(level, scaling.length); l >= 1; l--) {
    const v = scaling[l - 1];
    if (v !== null && v !== undefined) return { value: v, level: l };
  }
  for (let l = level + 1; l <= scaling.length; l++) {
    const v = scaling[l - 1];
    if (v !== null && v !== undefined) return { value: v, level: l };
  }
  return null;
}

/** ดาเมจบทบาทที่มาจากความชำนาญพื้นฐานของตัวละคร — ถูกแทนด้วยค่าจากรองเท้าเมื่อใส่รองเท้า */
const ROLE_DMG_STATS = new Set(["brawlDmg", "suppressionDmg", "neutralizationDmg", "supportDmg"]);

const SCOPE_OF: Record<CycleSkill | "chain", string> = {
  chain: "linkChain",
  basic: "basicAttack",
  switch: "switchSkill",
  special: "specialSkill",
  ultimate: "ultimate",
};

/** รวมเอฟเฟกต์ที่ตัวนี้ได้รับ เป็นตัวป้อนสูตรของท่าหนึ่ง */
function inputsFor(
  char: Character,
  effects: Sourced[],
  skill: CycleSkill | "chain",
  damageType: string,
  skillPercent: number,
  weakness = false,
  enemyDef?: number,
  /** ชื่อแถวดาเมจ (อังกฤษ) — บัฟที่มี condition.skillRow ใช้เฉพาะแถวที่ชื่อตรง */
  row?: string,
): DamageInput {
  // บัฟที่ติดเมื่อตีจุดอ่อน (เช่น ผู้พิทักษ์แห่งนครทองคำ) ติดเฉพาะเมื่อทีมตีจุดอ่อน — เป็นบัฟค้าง ใช้กับทุกท่าหลังติดแล้ว
  const teamWeak = weakness;
  // จุดอ่อนธาตุ: ตีด้วยธาตุที่ศัตรูแพ้ — กายภาพไม่มีจุดอ่อน
  const weak = weakness && damageType !== "physical";
  const inp: DamageInput = {
    enemyDef,
    weaknessHit: weak,
    weaknessDmg: 0,
    atkBase: char.stats?.atk ?? 0,
    atkFlat: 0,
    atkPercent: 0,
    skillPercent,
    critRate: char.stats?.critRate ?? 0,
    critDmg: char.stats?.critDmg ?? 0,
    elementalDmg: 0,
    bossDmg: 0,
    basicAttackDmg: 0,
    skillDmg: 0,
    defReduction: 0,
    resShred: 0,
  };
  for (const { effect: e } of effects) {
    if (e.value === undefined || e.stat === undefined) continue;
    if (e.condition?.vsBoss === false) continue;
    if (e.condition?.skillRow && !row?.includes(e.condition.skillRow)) continue;
    if (e.trigger === "onWeaknessHit" && !teamWeak) continue;
    if (e.damageType && e.stat !== "res" && e.damageType !== damageType) continue;
    const scopes = e.scopes as string[] | undefined;
    if (scopes?.includes("weaknessHit")) {
      const onEnemy = (e.target === "enemy" || e.target === "allEnemies") && e.kind === "debuff" && e.stat === "dmgTaken";
      if (weak && ((e.kind === "buff" && e.stat === "dmgDealt") || onEnemy)) inp.weaknessDmg! += e.value;
      continue;
    }
    if (scopes && !scopes.includes(SCOPE_OF[skill])) continue;
    const v = e.value;

    if (e.target === "enemy" || e.target === "allEnemies") {
      if (e.kind !== "debuff") continue;
      if (e.stat === "def") inp.defReduction! += v;
      else if (e.stat === "res" && (!e.damageType || e.damageType === damageType)) inp.resShred! += v;
      else if (e.stat === "dmgTaken") inp.bossDmg! += v;
      continue;
    }
    if (e.kind !== "buff") continue;
    switch (e.stat) {
      case "atk":
        if (e.unit === "percent") inp.atkPercent! += v;
        else inp.atkFlat! += v;
        break;
      case "critRate":
        inp.critRate += v;
        break;
      case "critDmg":
        inp.critDmg += v;
        break;
      case "brawlDmg":
        if (char.role === "fighter") inp.brawlDmg = (inp.brawlDmg ?? 0) + v;
        break;
      case "roleMastery":
        // ความชำนาญบทบาทจากรองเท้า (แทนค่าพื้นฐาน ไม่ได้บวก) → % ดาเมจบทบาท · สูตรมีแค่ดาเมจปะทะของบรอว์เลอร์
        if (char.role === "fighter") inp.brawlDmg = (inp.brawlDmg ?? 0) + proficiencyToPercent(v);
        break;
      case "dmgDealt":
        if (e.damageType) inp.elementalDmg! += v;
        else if (scopes) {
          if (skill === "basic") inp.basicAttackDmg! += v;
          else inp.skillDmg! += v;
        } else inp.bossDmg! += v;
        break;
    }
  }
  return inp;
}

/** เอฟเฟกต์ที่สมาชิกแต่ละตัวได้รับจริง — ของตัวเอง + บัฟทีม/ดีบัฟศัตรูจากเพื่อน + อาหาร + ค่าพลังพื้นฐาน */
export function receivedEffects(
  lo: BuildLoadout,
  weakness = lo.weaknessHit ?? false,
): { char: Character | undefined; effects: Tagged[] }[] {
  const chars = lo.members.map((m) => characterById(m.characterId));
  const food = [lo.food.entree, lo.food.side].flatMap((id) => {
    const f = FOOD.find((x) => x.id === id);
    return f ? f.effects.filter((e) => weakness || e.trigger !== "onWeaknessHit").map(tag(f.name, false)) : [];
  });

  // เอฟเฟกต์ของแต่ละตัว — target team/ally ส่งให้ทุกคน, enemy ส่งให้ทุกคน (ดีบัฟบนศัตรูตัวเดียวกัน)
  // บัฟที่ติดเมื่อตีจุดอ่อนธาตุ นับเฉพาะบิ้วที่ตีจุดอ่อน
  const own = lo.members.map((m, i) =>
    (chars[i] ? memberEffects(m, chars[i]!, m.awaken ?? lo.awaken) : []).filter((t) => weakness || t.effect.trigger !== "onWeaknessHit"),
  );
  // เอฟเฟกต์เพิ่มเติมของลิงก์เชนที่โผล่ในรอบ — ลงที่ศัตรู จึงได้ทั้งทีม
  const chainFx = lo.members.flatMap((m, i) => {
    const lc = LINK_CHAINS.find((c) => c.id === m.linkChain);
    const ch = chars[i];
    if (!lc || !ch || !chainAppears(lc, ch, m.cycle ?? CYCLE_SKILLS, weakness, lo.staggerOften)) return [];
    return chainEffects(lc).effects.map(tag(lc.name, false));
  });
  // บัฟทีม/ดีบัฟศัตรูตัวเดียวกันจากหลายคน (เซ็ตเดียวกัน · Artifact เดียวกัน · มอนตำนานตัวเดียวกัน) ไม่ทับซ้อน — นับครั้งเดียว
  // แบบเดียวกับมอนตัวเดียวกันในทีม (ผู้เล่นบอก 2026-10-24) · ตัวคำนวณเคยนับซ้ำจนเสนอให้ทุกคนใส่โบนัสเซ็ตเดียวกัน
  const seen = new Set<string>();
  const shared = [...own.flat(), ...chainFx]
    .filter((t) => ["team", "ally", "enemy", "allEnemies"].includes(t.effect.target))
    .filter((t) => {
      const e = t.effect;
      const k = [t.from.en ?? t.from.th, e.stat, e.damageType, e.value, e.target, e.trigger, (e.scopes ?? []).join(",")].join("|");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  return lo.members.map((mem, i) => {
    const char = chars[i];
    if (!char) return { char, effects: [] };
    // บัฟทีมที่จอบอกว่าให้เฉพาะเพื่อนธาตุหรือระยะหนึ่ง
    const fits = ({ effect: e }: Tagged) => {
      const c = e.condition;
      if (c?.teammateElement && c.teammateElement !== char.element) return false;
      if (c?.teammateNotElement && c.teammateNotElement === char.element) return false;
      if (c?.teammateRange && c.teammateRange !== char.range) return false;
      return true;
    };
    const hasBoots = own[i].some((t) => t.effect.stat === "roleMastery");
    const base = { th: "ค่าพลังพื้นฐาน", en: "Base stats" };
    return {
      char,
      effects: [
        ...own[i].filter((t) => t.effect.target === "self"),
        ...shared.filter(fits),
        ...food,
        ...(char.otherStats ?? [])
          .filter((e) => !(e.stat === "dmgDealt" && e.scopes?.includes("weaknessHit")))
          // ใส่รองเท้าแล้วความชำนาญกลายเป็นค่าของรองเท้า ไม่ได้บวกกับค่าพื้นฐาน (ผู้เล่นบอก 2026-10-24)
          // → ตัดดาเมจบทบาทพื้นฐาน (เช่น ดาเมจปะทะ 12.18% จากความชำนาญ 1,078) ออก ให้ค่าจากรองเท้าแทน
          .filter((e) => !(hasBoots && (ROLE_DMG_STATS.has(e.stat ?? "") || e.stat?.endsWith("Power"))))
          .map(tag(base, true)),
      ],
    };
  });
}

export type StatSheet = {
  atk: number;
  def: number;
  hp: number;
  critRate: number;
  critDmg: number;
  elementDmg: number;
  /** ดาเมจมอนสเตอร์บอส (เงื่อนไข vsBoss) */
  bossDmg: number;
  /** ดาเมจทั่วไปที่ไม่ผูกธาตุ/ท่า + ดีบัฟเพิ่มดาเมจที่ได้รับของศัตรู */
  dmgBonus: number;
  /** ดาเมจธาตุจุดอ่อน — ฐาน 125% ตามจอ + โบนัส */
  weaknessDmg: number;
  basicAttackDmg: number;
  skillDmg: number;
  /** ความชำนาญบทบาท (แต้ม) */
  roleMastery: number;
  roleDmg: number;
  enemyDefDown: number;
  enemyResDown: number;
  /** คูลดาวน์สกิลพิเศษหลังลด (วินาที) · 0 = ไม่รู้ / สกิลกดต่อได้ */
  specialCd: number;
};

/** สรุปค่าพลัง — gearOnly = เฉพาะค่าพลังของของที่ใส่ ไม่รวมบัฟ */
export function statSheet(char: Character, effects: Tagged[], gearOnly: boolean): StatSheet {
  const s: StatSheet = {
    atk: 0, def: 0, hp: 0,
    critRate: char.stats?.critRate ?? 0, critDmg: char.stats?.critDmg ?? 0,
    elementDmg: 0, bossDmg: 0, dmgBonus: 0, weaknessDmg: FORMULA.constants.weaknessBase * 100, basicAttackDmg: 0, skillDmg: 0, roleMastery: 0, roleDmg: 0, enemyDefDown: 0, enemyResDown: 0, specialCd: 0,
  };
  const flat = { atk: 0, def: 0, hp: 0 };
  const pct = { atk: 0, def: 0, hp: 0 };
  for (const t of effects) {
    if (gearOnly && !t.gear) continue;
    const e = t.effect;
    if (e.value === undefined || e.stat === undefined) continue;
    if (e.condition?.vsBoss === false) continue;
    // บัฟของท่าย่อยท่าเดียว ไม่ใช่ค่าพลังของทั้งท่า — โชว์ในรายการบัฟแทน
    if (e.condition?.skillRow) continue;
    const v = e.value;
    if (e.target === "enemy" || e.target === "allEnemies") {
      if (e.kind !== "debuff") continue;
      if (e.stat === "def") s.enemyDefDown += v;
      else if (e.stat === "res" && (!e.damageType || e.damageType === char.element)) s.enemyResDown += v;
      else if (e.stat === "dmgTaken") {
        if (e.scopes?.includes("weaknessHit")) s.weaknessDmg += v;
        else s.dmgBonus += v;
      }
      continue;
    }
    if (e.kind !== "buff") continue;
    const scopes = e.scopes as string[] | undefined;
    switch (e.stat) {
      case "atk": case "def": case "hp":
        if (e.unit === "percent") pct[e.stat] += v;
        else flat[e.stat] += v;
        break;
      case "critRate": s.critRate += v; break;
      case "critDmg": s.critDmg += v; break;
      case "brawlDmg": case "suppressionDmg": case "neutralizationDmg": case "supportDmg":
        if (ROLE_STAT_OF[char.role] === e.stat) s.roleDmg += v;
        break;
      case "fighterPower": case "assassinPower": case "destroyerPower": case "supportPower":
        s.roleMastery += v;
        break;
      case "roleMastery":
        s.roleMastery += v;
        s.roleDmg += proficiencyToPercent(v);
        break;
      case "dmgDealt":
        if (e.damageType && e.damageType !== char.element) break;
        if (scopes?.includes("weaknessHit")) s.weaknessDmg += v;
        else if (scopes) {
          if (scopes.includes("basicAttack")) s.basicAttackDmg += v;
          else s.skillDmg += v;
        } else if (e.damageType) s.elementDmg += v;
        else if (e.condition?.vsBoss === true) s.bossDmg += v;
        else s.dmgBonus += v;
        break;
    }
  }
  s.atk = ((char.stats?.atk ?? 0) + flat.atk) * (1 + pct.atk / 100);
  s.def = ((char.stats?.def ?? 0) + flat.def) * (1 + pct.def / 100);
  s.hp = ((char.stats?.hp ?? 0) + flat.hp) * (1 + pct.hp / 100);
  const cd = specialCooldown(char);
  if (cd !== undefined) s.specialCd = cd / specialCastFactor(char, effects.filter((t) => !gearOnly || t.gear));
  return s;
}

/** ดาเมจบทบาทของแต่ละบทบาท — ตามบรรทัดใน Detailed Stats */
const ROLE_STAT_OF: Record<string, string> = {
  fighter: "brawlDmg",
  assassin: "suppressionDmg",
  destroyer: "neutralizationDmg",
  supporter: "supportDmg",
};

/** weakness: ศัตรูแพ้ธาตุของท่าที่ตี — ไม่ใส่ = ตาม lo.weaknessHit ของบิ้ว (ไม่มี = ไม่ตีจุดอ่อน) */
/** enemyDef: พลังป้องกันศัตรู — ไม่ใส่ = ไม่หักป้องกัน (ยังไม่รู้ค่าของบอส) · ใส่เพื่อดูว่าการลดพลังป้องกันคุ้มแค่ไหน */
export function teamDamage(lo: BuildLoadout, opts: { weakness?: boolean; enemyDef?: number } = {}): TeamDamage {
  const weakness = opts.weakness ?? lo.weaknessHit ?? false;
  const received = receivedEffects(lo, weakness);
  const members: MemberDamage[] = lo.members.map((mem, i) => {
    const { char, effects: mine } = received[i];
    if (!char) return { characterId: mem.characterId, skills: [], chain: 0, total: 0 };
    const level = skillLevel(char, mem.awaken ?? lo.awaken);
    const skills: SkillDamage[] = [];
    for (const key of mem.cycle ?? CYCLE_SKILLS) {
      const sk = char.skills?.[key];
      if (!sk) continue;
      const damageType = sk.damageType ?? char.element;
      const rows: SkillRow[] = [];
      let usedLevel = level;
      let sum = 0;
      for (const row of sk.values ?? []) {
        if (row.unit !== "percent") continue;
        const en = row.label.en ?? "";
        if (!DMG_ROW.test(en) || NOT_CYCLE_ROW.test(en)) continue;
        const at = valueAt(row.scaling, level);
        if (!at) continue;
        usedLevel = at.level;
        rows.push({ label: row.label, value: at.value });
        sum += computeDamage(inputsFor(char, mine, key, damageType, at.value, weakness, opts.enemyDef, en)).average;
      }
      if (key === "special") sum *= specialCastFactor(char, mine);
      if (rows.length) skills.push({ skill: key, level: usedLevel, rows, damageType, average: sum });
    }
    // ลิงก์เชน: โผล่ 1 ครั้งต่อรอบ (คูลดาวน์ 15 วิ ~ 1 รอบ) ถ้าเงื่อนไขปรากฏตัวเกิดในรอบ · ไม่บอกธาตุ = กายภาพ
    let chain = 0;
    const lc = LINK_CHAINS.find((c) => c.id === mem.linkChain);
    const top = lc && topLevel(lc);
    if (lc && top?.appearanceInfo.dmgPercentOfAtk && chainAppears(lc, char, mem.cycle ?? CYCLE_SKILLS, weakness, lo.staggerOften)) {
      chain = computeDamage(inputsFor(char, mine, "chain", top.damageType ?? "physical", top.appearanceInfo.dmgPercentOfAtk, weakness, opts.enemyDef)).average;
    }
    return { characterId: mem.characterId, skills, chain, total: skills.reduce((n, s) => n + s.average, 0) + chain };
  });
  return { members, total: members.reduce((n, m) => n + m.total, 0) };
}
