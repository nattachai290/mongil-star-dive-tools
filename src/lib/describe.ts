import type { Effect } from "./schema/common";
import type { Locale } from "./i18n";
import { label } from "./vocabulary";

/**
 * แปลงเอฟเฟกต์ที่เก็บเป็นโครงสร้าง ให้กลับเป็นประโยคที่คนอ่านรู้เรื่อง ทั้งสองภาษา
 *
 * นี่คือบททดสอบของโครงข้อมูล — ถ้าฟิลด์ไหนประกอบกลับเป็นประโยคไม่ได้
 * แปลว่าเก็บมาผิดรูปตั้งแต่แรก
 *
 * ตั้งใจ**ไม่**เลียนสำนวนเกมแบบคำต่อคำ เพราะเกมเรียงประโยคไม่เหมือนกันทุกใบ
 * ใช้รูปประโยคเดียวทั้งเว็บแทน จะได้เทียบมอนข้ามตัวได้ด้วยตา
 */
export type EffectDescription = {
  /** ประโยคหลัก เช่น "เพิ่มดาเมจสกิลสับเปลี่ยนของสมาชิกทีมทั้งหมด 11%" */
  headline: string;
  /** เงื่อนไขและระยะเวลา แสดงเป็นชิปแยก ไม่ยัดลงประโยคจนอ่านไม่ออก */
  qualifiers: string[];
};

const VERB_TH: Record<string, string> = {
  buff: "เพิ่ม",
  debuff: "ลด",
  heal: "ฟื้นฟู",
  shield: "ให้โล่",
  damage: "สร้าง",
  utility: "",
};

/** "ไฟ" -> "ธาตุไฟ" แต่ "กายภาพ" ไม่ใช่ธาตุ จึงไม่เติมคำนำหน้า */
function thDamageType(dt: string): string {
  const name = label("damageType", dt, "th");
  return dt === "physical" ? name : `ธาตุ${name}`;
}

/** "All teammates" -> "All teammates'" แต่ "Target" -> "Target's" */
function possessive(noun: string): string {
  return noun.endsWith("s") ? `${noun}'` : `${noun}'s`;
}

/** a/an ตามเสียงตัวแรก — "an Ice attack" ไม่ใช่ "a Ice attack" */
function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function formatValue(e: Effect): string {
  if (e.value === undefined) return "";
  const sign = e.kind === "debuff" ? "−" : "+";
  const unit = e.unit === "percent" ? "%" : e.unit === "seconds" ? "s" : "";
  return `${sign}${e.value}${unit}`;
}

function statPhrase(e: Effect, locale: Locale): string {
  if (!e.stat) return "";
  const stat = label("stat", e.stat, locale);
  const dt = e.damageType;
  const scope = e.scope;

  if (locale === "th") {
    // "ต้านทานธาตุ" + "ไฟ" ต่อกันตรง ๆ ส่วน stat อื่นเติมชนิดดาเมจต่อท้าย
    let core = stat;
    if (dt) core = e.stat === "elementRes" ? `${stat}${label("damageType", dt, "th")}` : `${stat}${thDamageType(dt)}`;
    return scope ? `${core}ของ${label("scope", scope, "th")}` : core;
  }

  // อังกฤษเรียงหน้าไปหลังเหมือนที่เกมเขียน: "Switch Skill Fire DMG"
  const parts = [
    scope ? label("scope", scope, "en") : "",
    dt ? label("damageType", dt, "en") : "",
    e.stat === "elementRes" && dt ? "RES" : stat,
  ];
  return parts.filter(Boolean).join(" ");
}

function qualifiers(e: Effect, locale: Locale): string[] {
  const th = locale === "th";
  const out: string[] = [];

  // ตัวกระตุ้น — always/passive ไม่ต้องบอก เพราะคือค่าเริ่มต้นอยู่แล้ว
  // จำนวนครั้ง/จำนวนตัวรวมอยู่ในประโยคเดียวกับตัวกระตุ้น ไม่แยกชิป
  // ไม่งั้นจะอ่านได้ว่า "เมื่อกำจัดมอนสเตอร์ · กำจัดศัตรู 10 ตัว" ซึ่งซ้ำตัวเอง
  const kills = e.condition?.killCount;
  const hits = e.condition?.hitCount;
  if (e.trigger !== "always" && e.trigger !== "passive") {
    const trigger = label("trigger", e.trigger, locale);
    if (kills) out.push(th ? `${trigger} ${kills} ตัว` : `upon defeating ${kills} enemies`);
    else if (hits) out.push(th ? `${trigger} ${hits} ครั้ง` : `${trigger} ${hits} times`);
    else out.push(trigger);
  } else if (hits) {
    out.push(th ? `ครบ ${hits} ครั้ง` : `after ${hits} times`);
  } else if (kills) {
    out.push(th ? `กำจัดศัตรูครบ ${kills} ตัว` : `after ${kills} kills`);
  }

  if (e.durationSec) out.push(th ? `นาน ${e.durationSec} วินาที` : `for ${e.durationSec}s`);

  const c = e.condition;
  if (c?.triggerDamageType) {
    const dt = c.triggerDamageType;
    const en = label("damageType", dt, "en");
    out.push(th ? `ด้วยการโจมตี${thDamageType(dt)}` : `with ${article(en)} ${en} attack`);
  }
  if (c?.enemyType) {
    const dt = c.enemyType;
    out.push(th ? `ใส่มอนสเตอร์${thDamageType(dt)}` : `against ${label("damageType", dt, "en")} enemies`);
  }
  if (c?.vsBoss === true) out.push(th ? "เฉพาะมอนสเตอร์บอส" : "bosses only");
  if (c?.vsBoss === false) out.push(th ? "เฉพาะมอนสเตอร์ทั่วไป" : "normal enemies only");
  if (c?.enemyState) {
    const state = label("enemyState", c.enemyState, locale);
    out.push(th ? `ใส่เป้าหมายที่${state}` : `against ${state.toLowerCase()} targets`);
  }
  if (c?.hpBelowPercent !== undefined) {
    out.push(th ? `เมื่อ HP ต่ำกว่า ${c.hpBelowPercent}%` : `when HP below ${c.hpBelowPercent}%`);
  }
  if (e.maxStacks) out.push(th ? `ซ้อนได้ ${e.maxStacks} ชั้น` : `stacks up to ${e.maxStacks}`);
  if (e.internalCooldownSec) {
    out.push(th ? `ทำงาน 1 ครั้ง ทุก ${e.internalCooldownSec} วินาที` : `once every ${e.internalCooldownSec}s`);
  }
  if (c?.note) {
    const note = c.note[locale] ?? c.note.en ?? c.note.th;
    if (note) out.push(note);
  }
  return out;
}

export function describeEffect(e: Effect, locale: Locale): EffectDescription {
  const stat = statPhrase(e, locale);
  const value = formatValue(e);
  const target = e.target;

  let headline: string;
  if (locale === "th") {
    // ผู้รับผลไม่ต้องบอกเมื่อเป็นตัวเราเอง ซึ่งเป็นค่าปกติ
    // บัฟใช้ "ให้" ดีบัฟใช้ "ของ" ไม่งั้นอ่านแล้วสลับฝั่งกัน
    const preposition = e.kind === "debuff" || e.kind === "damage" ? "ของ" : "ให้";
    const who = target === "self" ? "" : `${preposition}${label("target", target, "th")}`;
    headline = `${VERB_TH[e.kind] ?? ""}${stat}${who} ${value}`.trim();
  } else {
    const who = target === "self" ? "" : `${possessive(label("target", target, "en"))} `;
    headline = `${who}${stat} ${value}`.trim();
  }

  return { headline, qualifiers: qualifiers(e, locale) };
}
