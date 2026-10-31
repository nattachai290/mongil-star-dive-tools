import type { Effect, LocalizedText } from "./schema/common";
import type { Character, LinkChain } from "./schema/entities";

/**
 * ลิงก์เชนในตัวคำนวณ (ผู้เล่นสั่ง 2026-10-31 "ให้ตัวคำนวณนับลิงก์เชนด้วย")
 *
 * ข้อมูลลิงก์เชนเก็บเอฟเฟกต์เพิ่มเติมเป็นข้อความตามจอ (bonusEffects) ไฟล์นี้แปลงเฉพาะรูปประโยคที่มีผลกับดาเมจ
 * และอ่านได้ตรงตัว — ประโยคที่ไม่รู้จัก (สถานะควบคุม ฟื้นฟู ซูเปอร์อาร์เมอร์ ฯลฯ) ข้ามไป ไม่เดา
 */

const ELEMENT_TH: Record<string, string> = {
  ดิน: "earth",
  ไฟ: "fire",
  น้ำแข็ง: "ice",
  ลม: "wind",
  สายฟ้า: "lightning",
};

function parseOne(text: string): Effect | undefined {
  const dur = text.match(/\(([\d.]+) วินาที\)/);
  const durationSec = dur ? Number(dur[1]) : undefined;
  let m = text.match(/^ลดต้านทานธาตุ(ดิน|ไฟ|น้ำแข็ง|ลม|สายฟ้า) ([\d.]+)%/);
  if (m) {
    return { kind: "debuff", stat: "res", damageType: ELEMENT_TH[m[1]], value: Number(m[2]), unit: "percent", target: "enemy", trigger: "passive", durationSec } as Effect;
  }
  m = text.match(/^ลดพลังป้องกัน ([\d.]+)%/);
  if (m) return { kind: "debuff", stat: "def", value: Number(m[1]), unit: "percent", target: "enemy", trigger: "passive", durationSec } as Effect;
  // "เพิ่มดาเมจธาตุจุดอ่อน N%" กับ "เพิ่มดาเมจธาตุจุดอ่อนที่ได้รับ N%" — ลงที่ศัตรู ทั้งทีมที่ตีจุดอ่อนได้ผล
  m = text.match(/^เพิ่มดาเมจธาตุจุดอ่อน(?:ที่ได้รับ)? ([\d.]+)%/);
  if (m) {
    return { kind: "debuff", stat: "dmgTaken", scopes: ["weaknessHit"], value: Number(m[1]), unit: "percent", target: "enemy", trigger: "passive", durationSec } as Effect;
  }
  return undefined;
}

/** ขั้นสูงสุดที่อ่านมาของลิงก์เชน */
export function topLevel(chain: LinkChain) {
  return [...chain.levels].sort((a, b) => b.level - a.level)[0];
}

/** เอฟเฟกต์ที่แปลงได้ + ข้อความที่ไม่ได้นับ */
export function chainEffects(chain: LinkChain): { effects: Effect[]; skipped: LocalizedText[] } {
  const effects: Effect[] = [];
  const skipped: LocalizedText[] = [];
  for (const b of topLevel(chain)?.bonusEffects ?? []) {
    const e = parseOne(b.th ?? "");
    if (e) effects.push(e);
    else skipped.push(b);
  }
  return { effects, skipped };
}

/**
 * ลิงก์เชนโผล่ในรอบของตัวนี้ไหม — ดูจากเงื่อนไขปรากฏตัวเทียบกับท่าที่ใช้ในรอบ
 * นับเงื่อนไขที่เกิดจากรอบสกิล + ตีศัตรูที่ติดมึนงง (เฉพาะบิ้วที่ตั้ง staggerOften) · ไม่นับ หลบ/โต้กลับ/โดนตี/HP/สเตมินา/สถานะศัตรูอื่น/ธาตุศัตรู
 */
export function chainAppears(
  chain: LinkChain,
  char: Character,
  cycle: readonly string[],
  weakness: boolean,
  staggerOften = false,
): boolean {
  const conds = topLevel(chain)?.appearanceConditions ?? [];
  const has = (k: string) => cycle.includes(k);
  const ok: Record<string, boolean> = {
    specialSkill: has("special"),
    switchSkill: has("switch"),
    useUltimate: has("ultimate"),
    landUltimate: has("ultimate"),
    landAttack: true,
    inCombat: true,
    landCrit: true,
    weaknessAttack: weakness,
    // มึนงงบ่อยแค่ไหนขึ้นกับทีม — ทีมที่มีตัวทำเกจมึนงงเต็มไว เช่น นากิ (ผู้เล่นบอก 2026-10-31) ตั้งในบิ้ว
    attackStaggered: staggerOften,
    landFireAttack: char.element === "fire",
    landIceAttack: char.element === "ice",
    landWindAttack: char.element === "wind",
  };
  return conds.some((c) => ok[c] === true);
}
