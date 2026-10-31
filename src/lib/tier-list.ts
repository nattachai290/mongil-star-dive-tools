import { CHARACTERS } from "./data";
import { teamDamage } from "./team-damage";
import { buildLoadout } from "./schema/entities";
import type { Character } from "./schema/entities";

/**
 * Tier list — ผู้เล่นสั่ง 2026-10-31
 * - ใช้แค่ตัวละคร + สกิล + ปลุกพลัง ไม่คิดอุปกรณ์ Artifact มอนสเตอร์ อาหาร หรือทีมที่จัด
 * - แยกตามขั้นปลุกพลัง 0–6 · ขั้นติดกันที่ได้ tier เดียวกันรวมเป็นช่วง เช่น 0–6
 * - คิดคะแนนต่างกันตามบทบาท ไม่งั้นดาเมจกับซัพพอร์ตเทียบกันไม่ได้:
 *   · สายดาเมจ (ไฟเตอร์ แอสแซสซิน เดสทรอยเยอร์) = ดาเมจต่อรอบของตัวเอง (ตีปกติ สับเปลี่ยน พิเศษ อัลติเมต)
 *   · ซัพพอร์ต = ดาเมจทีมที่เพิ่มขึ้นเมื่อใส่คู่กับตัวดาเมจธาตุเดียวกัน (เฉลี่ยทุกตัว ที่ปลุก 0)
 *     รวมดาเมจของซัพพอร์ตเองและบัฟที่ให้ — ไม่ได้เลือกทีม แค่ใช้ตัวธาตุเดียวกันทุกตัวเป็นตัวอ้างอิง
 * - แต่ละกลุ่มตัด tier ด้วยลำดับเปอร์เซ็นไทล์ของทุกคู่ (ตัวละคร, ขั้นปลุกพลัง) ในกลุ่มนั้น
 *   สองกลุ่มจึงมีสัดส่วนแต่ละ tier เท่ากัน
 * - ไม่ตีจุดอ่อน ไม่หักพลังป้องกันศัตรู
 */

/** tier เป็นเลข 0–7 (ผู้เล่นสั่ง 2026-10-31) · 0 ดีที่สุด */
export const TIERS = ["0", "1", "2", "3", "4", "5", "6", "7"] as const;
export type Tier = (typeof TIERS)[number];
/** สัดส่วนสะสมจากบนลงล่าง: 0 5% · 1 10% · 2 15% · 3 20% · 4 20% · 5 15% · 6 10% · 7 5% */
const CUTS: [Tier, number][] = [
  ["0", 0.05],
  ["1", 0.15],
  ["2", 0.3],
  ["3", 0.5],
  ["4", 0.7],
  ["5", 0.85],
  ["6", 0.95],
  ["7", 1],
];
export const STAGES = [0, 1, 2, 3, 4, 5, 6] as const;

export type TierGroup = "dps" | "support";
export type TierRange = { from: number; to: number; tier: Tier; score: number };
export type TierEntry = {
  characterId: string;
  group: TierGroup;
  ranges: TierRange[];
  /** แถวดาเมจบางแถวยังไม่มีค่าที่เลเวล 12 (อ่านจากจอที่สกิลเลเวลต่ำ) — คะแนนต่ำกว่าจริง */
  incomplete: boolean;
};

const groupOf = (c: Character): TierGroup => (c.role === "supporter" ? "support" : "dps");

function loadout(members: [string, number][]) {
  return buildLoadout.parse({
    awaken: 0,
    members: members.map(([characterId, awaken], i) => ({
      characterId,
      awaken,
      // ตัวที่สองเข้ามาใช้สับเปลี่ยน พิเศษ อัลติเมต แบบเดียวกับตัวรองในบิ้ว
      ...(i > 0 ? { cycle: ["switch", "special", "ultimate"] } : {}),
    })),
  });
}

/** ข้อมูลสกิลไม่ครบ: แถวในสกิลที่ใช้ในรอบ ไม่มีค่าที่เลเวล 12 ขึ้นไป */
function isIncomplete(c: Character): boolean {
  return (["basic", "switch", "special", "ultimate"] as const).some((k) =>
    (c.skills?.[k]?.values ?? []).some((r) => r.unit === "percent" && !r.scaling.slice(11).some((v) => v !== null && v !== undefined)),
  );
}

function scores(): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const dps = CHARACTERS.filter((c) => groupOf(c) === "dps");
  const solo = new Map(dps.map((d) => [d.id, teamDamage(loadout([[d.id, 0]])).total]));
  for (const c of CHARACTERS) {
    if (groupOf(c) === "dps") {
      out.set(c.id, STAGES.map((a) => teamDamage(loadout([[c.id, a]])).total));
      continue;
    }
    const mates = dps.filter((d) => d.element === c.element && (solo.get(d.id) ?? 0) > 0);
    out.set(
      c.id,
      STAGES.map((a) => {
        if (mates.length === 0) return 0;
        const gain = mates.map((d) => teamDamage(loadout([[d.id, 0], [c.id, a]])).total / solo.get(d.id)! - 1);
        return gain.reduce((x, y) => x + y, 0) / gain.length;
      }),
    );
  }
  return out;
}

let cache: TierEntry[] | undefined;

export function tierList(): TierEntry[] {
  if (cache) return cache;
  const sc = scores();
  const entries: TierEntry[] = [];
  for (const group of ["dps", "support"] as const) {
    const chars = CHARACTERS.filter((c) => groupOf(c) === group);
    const all = chars.flatMap((c) => sc.get(c.id) ?? []).sort((a, b) => b - a);
    const tierOf = (v: number): Tier => {
      // ลำดับของคะแนนนี้ในกลุ่ม (คะแนนเท่ากันได้ลำดับเดียวกัน)
      const rank = all.findIndex((x) => x <= v);
      const p = (rank + 1) / all.length;
      return CUTS.find(([, cut]) => p <= cut)![0];
    };
    for (const c of chars) {
      const s = sc.get(c.id) ?? [];
      const ranges: TierRange[] = [];
      STAGES.forEach((a) => {
        const tier = tierOf(s[a]);
        const last = ranges.at(-1);
        if (last && last.tier === tier) {
          last.to = a;
          last.score = s[a];
        } else ranges.push({ from: a, to: a, tier, score: s[a] });
      });
      entries.push({ characterId: c.id, group, ranges, incomplete: isIncomplete(c) });
    }
  }
  cache = entries;
  return entries;
}
