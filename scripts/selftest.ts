/**
 * ทดสอบว่า schema กับสูตรดาเมจทำงานถูก โดยไม่ต้องมีข้อมูลจริงในโปรเจกต์
 *
 * มีไว้เพราะ data/ ยังว่างอยู่ — ถ้าไม่มีไฟล์นี้ validate:data จะผ่านตลอด
 * แม้ schema จะพังอยู่ ทำให้ไม่รู้ตัวจนวันที่เริ่มกรอกข้อมูลจริง
 */
import { character, food, monsterling } from "../src/lib/schema/entities";
import { computeDamage, missingConstants, sumBuffs } from "../src/lib/formula";
import { LINK_CHAIN_LIST_IS_COMPLETE, linkableBadge, linkableIds, linkableOf } from "../src/lib/linkable";
import type { Effect } from "../src/lib/schema/common";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { console.log(`  ✓ ${name}`); return; }
  failed += 1;
  console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`);
}

const src = { verifiedAt: "2026-09-11", gameVersion: "1.4.0" };
const t = (th: string) => ({ th });

function sampleCharacter(patch: Record<string, unknown> = {}) {
  const skill = { name: t("สกิล"), desc: t("คำอธิบาย"), effects: [] };
  return {
    id: "test-char",
    name: t("ทดสอบ"),
    rarity: "SSR", element: "fire", role: "dps", tags: ["burst"],
    stats: { atLevel: 80, atBreakthrough: 4, hp: 12000, atk: 1300, def: 600, critRate: 5, critDmg: 150 },
    skills: { basic: skill, switch: skill, special: skill, ultimate: skill },
    awaken: [{ stage: 3, desc: t("+2 เลเวลสกิล"), skillLevelBonus: 2 }],
    breakthrough: [], provides: [], needs: ["critDmgBuff"],
    source: src,
    ...patch,
  };
}

console.log("\nschema");
check("ตัวละครที่ถูกต้องผ่าน", character.safeParse(sampleCharacter()).success);
check("id พิมพ์ใหญ่ถูกปฏิเสธ", !character.safeParse(sampleCharacter({ id: "Test_Char" })).success);
check("ธาตุนอกพจนานุกรมถูกปฏิเสธ", !character.safeParse(sampleCharacter({ element: "plasma" })).success);
check("แท็กนอกพจนานุกรมถูกปฏิเสธ", !character.safeParse(sampleCharacter({ tags: ["superBurst"] })).success);
check("verifiedAt ผิดรูปแบบถูกปฏิเสธ",
  !character.safeParse(sampleCharacter({ source: { ...src, verifiedAt: "11/09/2026" } })).success);
check("ข้อความที่ไม่มีทั้ง th และ en ถูกปฏิเสธ", !character.safeParse(sampleCharacter({ name: {} })).success);

const scaling = (n: number) => Array.from({ length: n }, () => 100);
check("scaling ต้องมี 16 ช่อง", !character.safeParse(sampleCharacter({
  skills: { ...sampleCharacter().skills as object, basic: { name: t("a"), desc: t("b"), effects: [], scaling: scaling(12) } },
})).success);
check("scaling 16 ช่องที่มี null ผ่าน", character.safeParse(sampleCharacter({
  skills: {
    ...(sampleCharacter().skills as Record<string, unknown>),
    basic: { name: t("a"), desc: t("b"), effects: [], scaling: [...scaling(12), null, null, null, null] },
  },
})).success);

console.log("\nเอฟเฟกต์");
const foodBase = { id: "f", name: t("อาหาร"), category: "entree", durationSec: 1800, source: src };
check("มี value แต่ไม่มี unit ถูกปฏิเสธ", !food.safeParse({
  ...foodBase, effects: [{ kind: "buff", stat: "atk", value: 18, target: "team", trigger: "always" }],
}).success);
check("buff ที่ไม่มี stat ถูกปฏิเสธ", !food.safeParse({
  ...foodBase, effects: [{ kind: "buff", value: 18, unit: "percent", target: "team", trigger: "always" }],
}).success);
check("hpBelow ที่ไม่มีเงื่อนไขถูกปฏิเสธ", !food.safeParse({
  ...foodBase, effects: [{ kind: "buff", stat: "atk", value: 18, unit: "percent", target: "team", trigger: "hpBelow" }],
}).success);
check("เอฟเฟกต์ที่ครบถ้วนผ่าน", food.safeParse({
  ...foodBase, effects: [{ kind: "buff", stat: "atk", value: 18, unit: "percent", target: "team", trigger: "always" }],
}).success);

console.log("\nสูตรดาเมจ");
const buffs: Effect[] = [
  { kind: "buff", stat: "atk", value: 12, unit: "percent", target: "self", trigger: "passive" },
  { kind: "buff", stat: "atk", value: 18, unit: "percent", target: "team", trigger: "always" },
  { kind: "buff", stat: "atk", value: 50, unit: "flat", target: "self", trigger: "passive" },
  { kind: "buff", stat: "def", value: 15, unit: "percent", target: "self", trigger: "passive" },
];
const summed = sumBuffs(buffs, "atk");
check("รวมบัฟ % เฉพาะ stat ที่ขอ", summed.percent === 30, `ได้ ${summed.percent} ควรเป็น 30`);
check("รวมบัฟค่าคงที่แยกจาก %", summed.flat === 50, `ได้ ${summed.flat} ควรเป็น 50`);

const r = computeDamage({ atkBase: 1300, buffs, skillPercent: 500, critRate: 5, critDmg: 150 });
const expectedAtk = 1300 * 1.3 + 50;
check("ATK รวมถูกต้อง", Math.abs(r.atkTotal - expectedAtk) < 1e-9, `ได้ ${r.atkTotal} ควรเป็น ${expectedAtk}`);
const expectedAvg = ((expectedAtk * 500) / 100) * (1 + 0.05 * 0.5);
check("ดาเมจเฉลี่ยถูกต้อง", r.average !== null && Math.abs(r.average - expectedAvg) < 1e-9,
  `ได้ ${r.average} ควรเป็น ${expectedAvg}`);
check("ไม่ใส่ป้องกันศัตรู = ข้ามขั้นนั้นแล้วเตือน",
  r.steps.find((s) => s.id === "afterDefense")?.skipped === true &&
  r.caveats.some((c) => c.includes("ก่อนหักป้องกัน")));

const blocked = computeDamage({ atkBase: 1300, buffs: [], skillPercent: 500, critRate: 5, critDmg: 150, enemyDef: 2000 });
check("ใส่ป้องกันศัตรูขณะค่าคงที่ยังไม่ยืนยัน = คืน null ไม่ใช่เดา",
  blocked.average === null && blocked.steps.find((s) => s.id === "afterDefense")?.blockedBy === "defConstant");
check("บอกได้ว่าค่าคงที่ไหนยังขาด", missingConstants().includes("defConstant"));

// ---------- ชนิดดาเมจอยู่ที่ท่า ไม่ใช่ที่ตัวละคร ----------
const skillShape = { name: t("ท่า"), desc: t("คำอธิบาย") };
check("สกิลเก็บชนิดดาเมจของตัวเองได้ และคนละอันกับธาตุตัวละคร",
  character.shape.skills.shape.basic.safeParse(
    { ...skillShape, damageType: "physical" }).success);
check("สกิลที่เปลี่ยนธาตุการตีปกติ เก็บได้",
  character.shape.skills.shape.special.safeParse(
    { ...skillShape, damageType: "fire", changesBasicAttackTo: "fire" }).success);
check("สกิลที่ไม่สร้างดาเมจ ไม่ต้องมี damageType",
  character.shape.skills.shape.switch.safeParse(skillShape).success);

// ---------- เอฟเฟกต์สายพันธุ์ของมอนสเตอร์ลิง ----------
const speciesEffect = {
  kind: "buff", stat: "atk", value: 5.78, unit: "percent",
  target: "team", trigger: "onWeaknessHit", durationSec: 10,
  internalCooldownSec: 20, condition: { vsBoss: true },
};
// "ดาเมจคริติคอลของสกิลอัลติเมต" = critDmg + scope ultimate ไม่ใช่ stat ใหม่
const scoped = {
  kind: "buff", stat: "critDmg", scope: "ultimate", value: 6.25, unit: "percent",
  target: "self", trigger: "always",
};
check("ขอบเขต (scope) แยกจาก stat ได้",
  monsterling.safeParse({ id: "bop-kkaebi", name: t("แกบีฟ้า"),
    speciesEffects: [scoped], effectsGrade: "gold", source: src }).success);
check("scope ที่ไม่มีในคำศัพท์ = ไม่ผ่าน",
  !monsterling.safeParse({ id: "bop-kkaebi", name: t("แกบีฟ้า"),
    speciesEffects: [{ ...scoped, scope: "ultimateSkill" }],
    effectsGrade: "gold", source: src }).success);
check("damageType รับ physical ได้ ต่างจาก element ที่มีแค่ 5 ธาตุ",
  monsterling.safeParse({ id: "wolf", name: t("หมาป่า"),
    speciesEffects: [{ ...scoped, scope: undefined, damageType: "physical" }],
    effectsGrade: "gold", source: src }).success);
check("เอฟเฟกต์สายพันธุ์แบบมีคูลดาวน์ในตัวและจำกัดเฉพาะบอส ผ่าน schema",
  monsterling.safeParse({
    id: "el-dorado-guardian", name: t("ผู้พิทักษ์แห่งนครทองคำ"),
    speciesEffects: [speciesEffect], effectsGrade: "gold", source: src,
  }).success);
check("มีเอฟเฟกต์สายพันธุ์แต่ไม่บอกแรงของมอนที่อ่านมา = ไม่ผ่าน",
  !monsterling.safeParse({
    id: "el-dorado-guardian", name: t("ผู้พิทักษ์แห่งนครทองคำ"),
    speciesEffects: [speciesEffect], source: src,
  }).success,
  "ตัวเลขขึ้นกับแรง ถ้าไม่รู้แรงก็ไม่รู้ว่าเป็นค่าเพดานหรือค่าของตัวอ่อน ๆ");
check("มอนที่ยังไม่มีเอฟเฟกต์สายพันธุ์ ไม่ต้องบอกแรง",
  monsterling.safeParse({ id: "cappy", name: t("ช้อปปี้"), source: src }).success);

// ---------- ป้าย "ใส่ลิงก์เชนได้" ----------
const chainIds = linkableIds([
  { monsterlingId: "spadupa" },
  { monsterlingId: "greenpadupa" },
  { monsterlingId: "spadupa" },
]);
check("มอนที่มีลิงก์เชนชี้มา = yes", linkableOf("spadupa", chainIds) === "yes");
check("ลิงก์เชนสองใบชี้มอนเดียวกันไม่นับซ้ำ", chainIds.size === 2, `ได้ ${chainIds.size} ควรเป็น 2`);
check("มอนที่ไม่มีลิงก์เชนชี้มา = unknown ไม่ใช่ no",
  LINK_CHAIN_LIST_IS_COMPLETE || linkableOf("cappy", chainIds) === "unknown",
  "ตราบใดที่ยังไม่ยืนยันว่ารายการลิงก์เชนในเกมครบ ห้ามสรุปว่าใส่ไม่ได้");
check("unknown ไม่แปะป้าย", linkableBadge("unknown") === null);
check("yes แปะป้ายสองภาษา", linkableBadge("yes")?.th === "ใส่ลิงก์เชนได้");

console.log(failed === 0 ? "\nผ่านทั้งหมด\n" : `\nไม่ผ่าน ${failed} ข้อ\n`);
if (failed > 0) process.exit(1);
