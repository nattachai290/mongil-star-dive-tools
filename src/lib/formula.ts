import formulaConfig from "../../data/meta/formula.json";
import type { Effect } from "./schema/common";

/**
 * เครื่องคำนวณดาเมจ — สูตรชุดเดียวที่หน้าเว็บและการวิเคราะห์ใช้ร่วมกัน
 *
 * ค่าคงที่ที่ยังเป็น null ใน data/meta/formula.json แปลว่า "ยังไม่ได้ยืนยันในเกม"
 * ขั้นที่ต้องใช้ค่านั้นจะคืน null พร้อมบอกว่าติดตรงไหน แทนการเดาค่าแล้วให้ตัวเลขผิด
 */
export const FORMULA = formulaConfig;

export type Matchup = "advantage" | "neutral" | "disadvantage";

export type DamageInput = {
  atkBase: number;
  /** บัฟทั้งหมดที่รวมแล้ว — มาจาก effects ของ Artifact, Equipment, เซ็ต, Monsterling, อาหาร */
  buffs: Effect[];
  skillPercent: number;
  critRate: number;
  critDmg: number;
  /** ไม่ใส่ = ข้ามขั้นหักป้องกัน แล้วบอกผู้ใช้ว่าเป็นดาเมจก่อนหักป้องกัน */
  enemyDef?: number;
  elementMatchup?: Matchup;
};

export type Step = {
  id: string;
  value: number | null;
  /** เหตุผลที่คำนวณขั้นนี้ไม่ได้ — ว่างแปลว่าคำนวณได้ */
  blockedBy?: string;
  /** ขั้นนี้ถูกข้ามเพราะผู้ใช้ไม่ได้ให้ข้อมูล ไม่ใช่เพราะข้อมูลเกมขาด */
  skipped?: boolean;
};

export type DamageResult = {
  steps: Step[];
  atkTotal: number;
  /** ดาเมจเฉลี่ยต่อครั้ง — null เมื่อมีขั้นไหนคำนวณไม่ได้ */
  average: number | null;
  onCrit: number | null;
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

function constant(key: keyof typeof FORMULA.constants): number | null {
  return FORMULA.constants[key];
}

export function computeDamage(input: DamageInput): DamageResult {
  const steps: Step[] = [];
  const caveats = [...FORMULA.notYetModeled];

  const atkBuff = sumBuffs(input.buffs, "atk");
  const atkTotal = input.atkBase * (1 + atkBuff.percent / 100) + atkBuff.flat;
  steps.push({ id: "atkTotal", value: atkTotal });

  const rawDamage = (atkTotal * input.skillPercent) / 100;
  steps.push({ id: "rawDamage", value: rawDamage });

  // ---- หักป้องกันศัตรู ----
  let afterDefense: number | null = rawDamage;
  const defConstant = constant("defConstant");
  if (input.enemyDef === undefined) {
    steps.push({ id: "afterDefense", value: rawDamage, skipped: true });
    caveats.push("ยังไม่ได้หักพลังป้องกันของศัตรู — ตัวเลขนี้คือดาเมจก่อนหักป้องกัน");
  } else if (defConstant === null) {
    afterDefense = null;
    steps.push({ id: "afterDefense", value: null, blockedBy: "defConstant" });
  } else {
    afterDefense = rawDamage * (1 - input.enemyDef / (input.enemyDef + defConstant));
    steps.push({ id: "afterDefense", value: afterDefense });
  }

  // ---- ตัวคูณธาตุ ----
  let afterElement: number | null = afterDefense;
  const matchup = input.elementMatchup ?? "neutral";
  const elementKey =
    matchup === "advantage" ? "elementAdvantage" : matchup === "disadvantage" ? "elementDisadvantage" : "elementNeutral";
  const elementMul = constant(elementKey);
  if (afterDefense === null) {
    steps.push({ id: "afterElement", value: null, blockedBy: "afterDefense" });
    afterElement = null;
  } else if (elementMul === null) {
    steps.push({ id: "afterElement", value: null, blockedBy: elementKey });
    afterElement = null;
  } else {
    afterElement = afterDefense * elementMul;
    steps.push({ id: "afterElement", value: afterElement });
  }

  // ---- คริติคอล ----
  const critRate = Math.min(input.critRate, 100) / 100;
  const critMul = input.critDmg / 100;
  const average = afterElement === null ? null : afterElement * (1 + critRate * (critMul - 1));
  const onCrit = afterElement === null ? null : afterElement * critMul;
  steps.push({ id: "average", value: average, blockedBy: average === null ? "afterElement" : undefined });
  steps.push({ id: "onCrit", value: onCrit, blockedBy: onCrit === null ? "afterElement" : undefined });

  return { steps, atkTotal, average, onCrit, caveats };
}

/** ค่าคงที่ที่ยังไม่ได้ยืนยัน — หน้าเว็บใช้ขึ้นป้ายเตือน */
export function missingConstants(): string[] {
  return Object.entries(FORMULA.constants)
    .filter(([, v]) => v === null)
    .map(([k]) => k);
}

export function isFormulaVerified(): boolean {
  return FORMULA.verified && missingConstants().length === 0;
}

/** ขั้นตอนที่โค้ดนี้ทำได้จริง — validate:data ใช้ตรวจว่า pipeline ใน formula.json ไม่หลุดไปจากนี้ */
export const IMPLEMENTED_STEPS = [
  "atkTotal",
  "rawDamage",
  "afterDefense",
  "afterElement",
  "average",
  "onCrit",
] as const;
