import formulaConfig from "../../data/meta/formula.json";
import type { Effect } from "./schema/common";

/**
 * เครื่องคำนวณดาเมจ — สูตรชุดเดียวที่หน้าเว็บและการวิเคราะห์ใช้ร่วมกัน
 *
 * ใช้สูตรจากชีตชุมชน "Mongil: Star Dive Calculators" V1.13 ไปก่อน (ผู้เล่นสั่ง 2026-10-24
 * "เอาสูตรนี้มาใช้ก่อน เจอใหม่ค่อยเปลี่ยน") — ถอดจากสูตรในเซลล์ผลลัพธ์ ไม่ใช่ข้อความสรุปสูตร
 * ในชีต เพราะข้อความสรุปเขียนต่างจากที่ชีตคำนวณจริงหลายจุด (ดู formula.json → sourceNotes)
 *
 * ทุกค่า % รับเป็นตัวเลขเปอร์เซ็นต์แบบที่จอเกมเขียน เช่น 37 = 37%
 */
export const FORMULA = formulaConfig;

export type DamageInput = {
  /** ATK ของตัวละครตามจอข้อมูล */
  atkBase: number;
  /** ATK ค่าคงที่ที่บวกเพิ่ม เช่น จากอาร์ติแฟกต์และอุปกรณ์ */
  atkFlat?: number;
  /** บัฟทั้งหมดที่รวมแล้ว — ใช้เฉพาะ stat "atk" หน่วย % (บวกกับ atkPercent) */
  buffs?: Effect[];
  atkPercent?: number;
  /** ตัวคูณสกิล % ของท่านั้น เช่น 100 */
  skillPercent: number;
  /** จำนวนฮิตของท่า — แต่ละฮิตเข้าสูตรแยก ดาเมจรวมเท่าเดิม แต่คริแยกกันได้ */
  hits?: number;
  critRate: number;
  /** ดาเมจคริติคอลรวมตามจอ เช่น 50 = คริแล้ว ×1.5 */
  critDmg: number;
  /** ดาเมจธาตุ % รวม */
  elementalDmg?: number;
  /** ตีจุดอ่อนธาตุหรือไม่ — จอเกมเขียน Elemental Weakness 125% */
  weaknessHit?: boolean;
  /** ดาเมจธาตุจุดอ่อนที่เพิ่มจากฐาน 125% */
  weaknessDmg?: number;
  bossDmg?: number;
  /** ดาเมจโจมตีพื้นฐาน % — ใส่เฉพาะเมื่อท่านี้เป็นโจมตีพื้นฐาน */
  basicAttackDmg?: number;
  /** ดาเมจสกิล % — ใส่เฉพาะเมื่อท่านี้เป็นสกิล */
  skillDmg?: number;
  /** ดาเมจหมดฤทธิ์ % — ใส่เฉพาะตอนศัตรูหมดฤทธิ์ */
  neutralizationDmg?: number;
  /** ดาเมจปะทะ % (บรอว์เลอร์) — ใส่เมื่อตัวละครเป็นบรอว์เลอร์ */
  brawlDmg?: number;
  enemiesOnField?: number;
  alliesOnField?: number;
  /** ไม่ใส่ = ข้ามการหักป้องกัน แล้วบอกผู้ใช้ */
  enemyDef?: number;
  defReduction?: number;
  /** ป้องกันธาตุของศัตรู (ค่าคงที่) */
  enemyEleDef?: number;
  /** ต้านทานธาตุของศัตรู % */
  enemyRes?: number;
  /** ลดต้านทานธาตุ % ที่ใส่ให้ศัตรู */
  resShred?: number;
};

export type Step = {
  id: string;
  value: number;
  /** ขั้นนี้ถูกข้ามเพราะผู้ใช้ไม่ได้ให้ข้อมูล */
  skipped?: boolean;
};

export type DamageResult = {
  steps: Step[];
  atkTotal: number;
  /** ดาเมจต่อท่าเมื่อไม่คริ / คริทุกฮิต / เฉลี่ยตามอัตราคริ */
  nonCrit: number;
  onCrit: number;
  average: number;
  /** ช่วงที่ดาเมจจริงแกว่ง (±variance) ของค่าเฉลี่ย */
  range: [number, number];
  /** สิ่งที่สูตรยังไม่ได้คิด ต้องแสดงคู่กับตัวเลขเสมอ */
  caveats: string[];
};

/** รวมบัฟ stat เดียวกันจากทุกแหล่ง แยกเป็น % กับค่าคงที่ */
export function sumBuffs(buffs: Effect[], stat: string): { percent: number; flat: number } {
  let percent = 0;
  let flat = 0;
  for (const b of buffs) {
    if (b.stat !== stat || b.value === undefined) continue;
    if (b.unit === "percent") percent += b.value;
    else if (b.unit === "flat") flat += b.value;
  }
  return { percent, flat };
}

/** ค่าความชำนาญบทบาท → % ดาเมจบทบาท (ชีต: ความชำนาญ × 0.0113%) */
export function proficiencyToPercent(points: number): number {
  return points * FORMULA.constants.proficiencyPercentPerPoint;
}

const pct = (v: number | undefined) => (v ?? 0) / 100;

export function computeDamage(input: DamageInput): DamageResult {
  const c = FORMULA.constants;
  const steps: Step[] = [];
  const caveats = [...FORMULA.notYetModeled];

  const buffAtk = sumBuffs(input.buffs ?? [], "atk");
  const atkSum = input.atkBase + (input.atkFlat ?? 0) + buffAtk.flat;
  const atkTotal = atkSum * (1 + pct(input.atkPercent) + buffAtk.percent / 100);
  steps.push({ id: "atkTotal", value: atkTotal });

  // ชีตใช้ ATK ก่อนบัฟ % ในตัวหารป้องกัน — คงไว้ตามชีต
  let defFactor = 1;
  if (input.enemyDef === undefined) {
    caveats.push("ยังไม่ได้หักพลังป้องกันของศัตรู — ตัวเลขนี้คือดาเมจก่อนหักป้องกัน");
    steps.push({ id: "defenseFactor", value: 1, skipped: true });
  } else {
    defFactor = atkSum / (atkSum + input.enemyDef * (1 - pct(input.defReduction)));
    steps.push({ id: "defenseFactor", value: defFactor });
  }

  const resGap = pct(input.enemyRes) - pct(input.resShred);
  const eleDef = (input.enemyEleDef ?? 0) * (1 + resGap);
  const baseHit = atkTotal * defFactor * pct(input.skillPercent) - eleDef;
  steps.push({ id: "baseHit", value: baseHit });

  const resFactor = 1 - resGap;
  const elementFactor = 1 + pct(input.elementalDmg);
  const weaknessFactor = input.weaknessHit ? c.weaknessBase + pct(input.weaknessDmg) : 1;
  const fieldBrawl =
    input.brawlDmg === undefined
      ? 0
      : ((input.enemiesOnField ?? 1) * c.brawlPerEnemy + (input.alliesOnField ?? 1) * c.brawlPerAlly) *
        (1 + pct(input.brawlDmg));
  const bonusFactor = 1 + pct(input.bossDmg) + fieldBrawl;
  const typeFactor =
    (1 + pct(input.basicAttackDmg)) * (1 + pct(input.skillDmg)) * (1 + pct(input.neutralizationDmg));

  const nonCrit = baseHit * resFactor * elementFactor * weaknessFactor * bonusFactor * typeFactor;
  steps.push({ id: "afterResistance", value: baseHit * resFactor });
  steps.push({ id: "nonCrit", value: nonCrit });

  const critMul = 1 + pct(input.critDmg);
  const critRate = Math.min(Math.max(input.critRate, 0), 100) / 100;
  const onCrit = nonCrit * critMul;
  const average = nonCrit * (1 + critRate * (critMul - 1));
  steps.push({ id: "onCrit", value: onCrit });
  steps.push({ id: "average", value: average });

  const v = c.variance;
  return {
    steps,
    atkTotal,
    nonCrit,
    onCrit,
    average,
    range: [average * (1 - v), average * (1 + v)],
    caveats,
  };
}

export function isFormulaVerified(): boolean {
  return FORMULA.verified;
}

/** ขั้นตอนที่โค้ดนี้ทำได้จริง — validate:data ใช้ตรวจว่า pipeline ใน formula.json ไม่หลุดไปจากนี้ */
export const IMPLEMENTED_STEPS = [
  "atkTotal",
  "defenseFactor",
  "baseHit",
  "afterResistance",
  "nonCrit",
  "onCrit",
  "average",
] as const;
