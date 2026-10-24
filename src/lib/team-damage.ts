import {
  ARTIFACTS,
  EQUIPMENT,
  EQUIPMENT_SETS,
  FOOD,
  GEAR_MAIN_STATS,
  MONSTERLINGS,
  MONSTER_STAT_TIERS,
  TRAIT_POOL,
  characterById,
  minSubstat,
} from "./data";
import { computeDamage, proficiencyToPercent, type DamageInput } from "./formula";
import type { Effect, LocalizedText } from "./schema/common";
import type { BuildLoadout, BuildMember, Character } from "./schema/entities";

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
  total: number;
};
export type TeamDamage = { members: MemberDamage[]; total: number };

export const TEAM_ASSUMPTIONS = [
  "บัฟทุกตัวทำงานตลอดรอบ (ไม่คิดเงื่อนไขและเวลาแสดงผล)",
  "ศัตรูเป็นบอส · ไม่ตีจุดอ่อน · ไม่หมดฤทธิ์ · ไม่หักป้องกัน",
  "ค่าหลักของอุปกรณ์คิดที่เลเวลสูงสุด · ค่ารองใช้ค่าต่ำสุด (เลเวล 1) ของระดับชิ้น",
  "ค่าพลังของมอน (ATK/DEF/HP) ตามชนิด บอส / ทั่วไป / ตำนาน · มอนทั่วไปบางตัวอนุมานจากการไม่มีลิงก์เชน",
  "ความชำนาญบทบาทคิดเป็นดาเมจเฉพาะบรอว์เลอร์ (ดาเมจปะทะ) — บทบาทอื่นสูตรยังไม่มี",
  "ยังไม่นับดาเมจต่อเนื่อง ดาเมจลิงก์เชน และสกิลสนับสนุน",
];

type Sourced = { effect: Effect; ownerId: string };

function asEffect(stat: string, value: number, unit: string, extra: Partial<Effect> = {}): Effect {
  return { kind: "buff", stat, value, unit, target: "self", trigger: "passive", ...extra } as Effect;
}

/** มอน 1 ช่อง → เอฟเฟกต์สายพันธุ์ + Trait ที่แปลงเป็นเอฟเฟกต์แล้ว */
function monsterEffects(slot: BuildMember["monsterlings"][number]): Effect[] {
  const mon = MONSTERLINGS.get(slot.id);
  const out = [...(mon?.speciesEffects ?? [])];
  // ค่าพลังของมอนบวกให้ตัวละครตอนใส่ — ตามแบบ (meta/monster-stat-tiers.json) เฉพาะตัวที่รู้แบบแล้ว
  const tier = MONSTER_STAT_TIERS.find((t) => t.id === mon?.statTier);
  if (tier) {
    out.push(asEffect("atk", tier.atk, "flat"), asEffect("def", tier.def, "flat"), asEffect("hp", tier.hp, "flat"));
  }
  for (const tr of slot.traits) {
    const t = TRAIT_POOL.pool.find((x) => x.id === tr.id);
    if (!t || t.kind !== "buff") continue;
    const value = t.values[tr.grade as keyof typeof t.values];
    out.push(
      asEffect(t.stat, value, t.unit, {
        damageType: t.damageType,
        scopes: t.scopes,
        condition: t.vsBoss === undefined ? undefined : { vsBoss: t.vsBoss },
      }),
    );
  }
  return out;
}

/** ทุกเอฟเฟกต์ที่มาจากตัวละคร 1 ตัวและของที่ใส่ ณ ขั้นปลุกพลังนี้ */
function memberEffects(mem: BuildMember, char: Character, awaken: number): Effect[] {
  const out: Effect[] = [];
  // คิดจากชิ้นหลัก (ชิ้นแรก) — ที่เหลือเป็นตัวสำรอง
  const art = ARTIFACTS.find((a) => a.id === mem.artifacts?.[0]);
  if (art) {
    for (const s of art.stats) out.push(asEffect(s.stat, s.value, s.unit, { damageType: s.damageType }));
    const top = [...art.fusion].sort((a, b) => b.artifactLevel - a.artifactLevel)[0];
    out.push(...(top?.effects ?? []));
  }
  const counts = new Map<string, number>();
  for (const id of Object.values(mem.equipment)) {
    const piece = EQUIPMENT.find((e) => e.id === id);
    if (!piece) continue;
    if (piece.setId) counts.set(piece.setId, (counts.get(piece.setId) ?? 0) + 1);
    // ค่าหลักไม่สุ่ม ผูกกับช่อง + ระดับ (meta/gear-main-stats.json) — คิดที่เลเวลสูงสุด
    const main = GEAR_MAIN_STATS.find((g) => g.slot === piece.slot && g.grade === piece.grade && g.stars === piece.stars);
    if (main) out.push(asEffect(main.stat, main.atMaxLevel, "flat"));
  }
  // ค่ารอง ชิ้นละ 4 — ใช้ค่าต่ำสุดของระดับชิ้นนั้น (ผู้เล่นสั่ง) · ต้านทานธาตุไม่มีผลกับดาเมจ จึงข้าม
  for (const [slot, keys] of Object.entries(mem.substats)) {
    const piece = EQUIPMENT.find((e) => e.id === mem.equipment[slot as keyof typeof mem.equipment]);
    if (!piece) continue;
    for (const key of keys ?? []) {
      const sub = minSubstat(key, piece.grade, piece.stars);
      if (sub && sub.stat !== "res") out.push(asEffect(sub.stat, sub.min, sub.unit));
    }
  }
  for (const [setId, n] of counts) {
    const set = EQUIPMENT_SETS.find((s) => s.id === setId);
    for (const b of set?.bonuses ?? []) if (b.pieces <= n) out.push(...b.effects);
  }
  for (const m of mem.monsterlings) out.push(...monsterEffects(m));
  if (mem.legendary) out.push(...monsterEffects(mem.legendary));
  for (const skill of Object.values(char.skills ?? {})) out.push(...(skill?.effects ?? []));
  for (const a of char.awaken ?? []) if (a.stage <= awaken) out.push(...a.effects);
  return out;
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

const SCOPE_OF: Record<CycleSkill, string> = {
  basic: "basicAttack",
  switch: "switchSkill",
  special: "specialSkill",
  ultimate: "ultimate",
};

/** รวมเอฟเฟกต์ที่ตัวนี้ได้รับ เป็นตัวป้อนสูตรของท่าหนึ่ง */
function inputsFor(
  char: Character,
  effects: Sourced[],
  skill: CycleSkill,
  damageType: string,
  skillPercent: number,
): DamageInput {
  const inp: DamageInput = {
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
    if (e.damageType && e.stat !== "res" && e.damageType !== damageType) continue;
    const scopes = e.scopes as string[] | undefined;
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

export function teamDamage(lo: BuildLoadout): TeamDamage {
  const chars = lo.members.map((m) => characterById(m.characterId));
  const food = [lo.food.entree, lo.food.side].flatMap((id) => FOOD.find((f) => f.id === id)?.effects ?? []);

  // เอฟเฟกต์ของแต่ละตัว — target team/ally ส่งให้ทุกคน, enemy ส่งให้ทุกคน (ดีบัฟบนศัตรูตัวเดียวกัน)
  const own = lo.members.map((m, i) => (chars[i] ? memberEffects(m, chars[i]!, lo.awaken) : []));
  const shared: Sourced[] = own.flatMap((list, i) =>
    list
      .filter((e) => ["team", "ally", "enemy", "allEnemies"].includes(e.target))
      .map((effect) => ({ effect, ownerId: lo.members[i].characterId })),
  );

  const members: MemberDamage[] = lo.members.map((mem, i) => {
    const char = chars[i];
    if (!char) return { characterId: mem.characterId, skills: [], total: 0 };
    // บัฟทีมที่จอบอกว่าให้เฉพาะเพื่อนธาตุหรือระยะหนึ่ง
    const fits = ({ effect: e }: Sourced) => {
      const c = e.condition;
      if (c?.teammateElement && c.teammateElement !== char.element) return false;
      if (c?.teammateNotElement && c.teammateNotElement === char.element) return false;
      if (c?.teammateRange && c.teammateRange !== char.range) return false;
      return true;
    };
    const hasBoots = own[i].some((e) => e.stat === "roleMastery");
    const mine: Sourced[] = [
      ...own[i].filter((e) => e.target === "self").map((effect) => ({ effect, ownerId: mem.characterId })),
      ...shared.filter(fits),
      ...food.map((effect) => ({ effect, ownerId: "food" })),
      ...(char.otherStats ?? [])
        .filter((e) => !(e.stat === "dmgDealt" && e.scopes?.includes("weaknessHit")))
        // ใส่รองเท้าแล้วความชำนาญกลายเป็นค่าของรองเท้า ไม่ได้บวกกับค่าพื้นฐาน (ผู้เล่นบอก 2026-10-24)
        // → ตัดดาเมจบทบาทพื้นฐาน (เช่น ดาเมจปะทะ 12.18% จากความชำนาญ 1,078) ออก ให้ค่าจากรองเท้าแทน
        .filter((e) => !(hasBoots && ROLE_DMG_STATS.has(e.stat ?? "")))
        .map((effect) => ({ effect, ownerId: mem.characterId })),
    ];
    const level = skillLevel(char, lo.awaken);
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
        sum += computeDamage(inputsFor(char, mine, key, damageType, at.value)).average;
      }
      if (rows.length) skills.push({ skill: key, level: usedLevel, rows, damageType, average: sum });
    }
    return { characterId: mem.characterId, skills, total: skills.reduce((n, s) => n + s.average, 0) };
  });
  return { members, total: members.reduce((n, m) => n + m.total, 0) };
}
