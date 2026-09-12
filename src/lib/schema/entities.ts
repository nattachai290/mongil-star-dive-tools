import { z } from "zod";
import { vocabEnum } from "../vocabulary";
import { effect, slug, source, statValue, text } from "./common";

/** ค่าสเกลของสกิลทั้ง 16 เลเวล — null คือยังไม่ได้เก็บค่านั้น ไม่ใช่ศูนย์ */
const scaling16 = z
  .array(z.number().nullable())
  .length(16, "ต้องมี 16 ช่อง (เลเวล 1–16) ช่องที่ยังไม่รู้ค่าให้ใส่ null");

const skill = z.object({
  name: text,
  desc: text,
  effects: z.array(effect).default([]),
  scaling: scaling16.optional(),
  cooldownSec: z.number().nonnegative().optional(),
  energyCost: z.number().nonnegative().optional(),
});

export const character = z.object({
  id: slug,
  name: text,
  rarity: vocabEnum("rarity"),
  element: vocabEnum("element"),
  role: vocabEnum("role"),
  tags: z.array(vocabEnum("tag")).default([]),

  stats: z.object({
    atLevel: z.number().int().positive(),
    atBreakthrough: z.number().int().min(0).max(6),
    hp: z.number().positive(),
    atk: z.number().positive(),
    def: z.number().positive(),
    critRate: z.number().min(0).max(100),
    critDmg: z.number().min(100),
  }),

  skills: z.object({
    basic: skill,
    switch: skill,
    special: skill,
    ultimate: skill,
  }),

  awaken: z
    .array(
      z.object({
        stage: z.number().int().min(1).max(6),
        name: text.optional(),
        desc: text,
        effects: z.array(effect).default([]),
        skillLevelBonus: z.number().int().positive().optional(),
      }),
    )
    .max(6),

  breakthrough: z
    .array(z.object({ stage: z.number().int().min(1).max(6), unlocks: z.array(z.string()) }))
    .default([]),

  /** บัฟหรือดีบัฟที่ตัวนี้ยื่นให้ทีม — ใช้จับคู่กับ needs ของคนอื่นตอนจัดทีม */
  provides: z.array(effect).default([]),
  /** สิ่งที่ตัวนี้อยากได้จากเพื่อน — ทีมที่ดีคือทีมที่ needs ถูกครอบหมด */
  needs: z.array(vocabEnum("need")).default([]),

  playstyle: z
    .object({
      rotationNote: text.optional(),
      difficulty: vocabEnum("difficulty").optional(),
      energyHungry: z.boolean().optional(),
    })
    .optional(),

  recommended: z
    .object({
      artifacts: z.array(slug).default([]),
      equipment: z.array(slug).default([]),
      monsterlings: z.array(slug).default([]),
      teammates: z.array(slug).default([]),
      builds: z.array(slug).default([]),
    })
    .default({ artifacts: [], equipment: [], monsterlings: [], teammates: [], builds: [] }),

  images: z.object({ icon: z.string().optional(), portrait: z.string().optional(), splash: z.string().optional() }).optional(),
  source,
});

export const artifact = z.object({
  id: slug,
  name: text,
  rarity: vocabEnum("rarity"),
  mainStat: statValue,
  effects: z.array(effect).default([]),
  desc: text.optional(),
  obtain: z.object({ method: vocabEnum("obtainMethod"), note: text.optional() }).optional(),
  recommendedFor: z.array(slug).default([]),
  images: z.object({ icon: z.string().optional() }).optional(),
  source,
});

export const equipment = z.object({
  id: slug,
  name: text,
  rarity: vocabEnum("rarity"),
  slot: vocabEnum("slot"),
  setId: slug.optional(),
  mainStat: statValue,
  subStats: z.array(statValue).default([]),
  effects: z.array(effect).default([]),
  images: z.object({ icon: z.string().optional() }).optional(),
  source,
});

/** โบนัสเซ็ต อยู่ใน data/meta/sets.json เพราะเป็นของกลางที่ equipment หลายชิ้นอ้างถึง */
export const equipmentSet = z.object({
  id: slug,
  name: text,
  bonuses: z.array(
    z.object({
      pieces: z.number().int().min(2).max(6),
      desc: text,
      effects: z.array(effect).default([]),
    }),
  ),
  source,
});

export const monsterling = z.object({
  id: slug,
  name: text,
  /** ตำแหน่งในสมุดภาพมอน — ต้องมีคู่กัน เพราะแต่ละเล่มเริ่มนับ No.1 ใหม่ */
  dex: z.object({ book: vocabEnum("dexBook"), no: z.number().int().positive() }).optional(),
  /**
   * ใส่ลิงก์ได้หรือไม่ — ไม่ใส่ = "ยังไม่รู้" ไม่ใช่ "ไม่ได้"
   * หน้าเว็บต้องแยกสามสถานะ ไม่งั้นตัวที่ยังไม่ได้เช็คจะถูกแสดงว่าใส่ลิงก์ไม่ได้
   */
  linkable: z.boolean().optional(),
  effects: z.array(effect).default([]),
  obtain: z.object({ method: vocabEnum("obtainMethod"), note: text.optional() }).optional(),
  images: z.object({ icon: z.string().optional() }).optional(),
  source,
});

/*
 * ไม่มี rarity, สายพันธุ์ และ Trait ในนี้โดยตั้งใจ
 * Trait ถูกสุ่มให้มอนแต่ละตัวตอนจับ ไม่ได้ผูกกับสายพันธุ์ — เก็บไว้ที่นี่เมื่อไหร่
 * ก็กลายเป็นข้อมูลผิดทันที เพราะมอนชื่อเดียวกันคนละตัวจะได้ Trait ไม่เหมือนกัน
 */

export const food = z.object({
  id: slug,
  name: text,
  category: vocabEnum("foodCategory"),
  effects: z.array(effect).default([]),
  durationSec: z.number().positive(),
  exquisite: z.object({ effects: z.array(effect).default([]) }).optional(),
  ingredients: z
    .array(z.object({ name: text, qty: z.number().int().positive(), swappable: z.boolean().default(false) }))
    .default([]),
  unlock: z.object({ method: vocabEnum("obtainMethod"), note: text.optional() }).optional(),
  images: z.object({ icon: z.string().optional() }).optional(),
  source,
});

export const build = z.object({
  id: slug,
  characterId: slug,
  title: text,
  contentType: vocabEnum("contentType"),
  artifacts: z.array(slug).default([]),
  equipment: z.array(slug).default([]),
  setIds: z.array(slug).default([]),
  monsterlings: z.array(slug).default([]),
  food: z.object({ entree: slug.optional(), side: slug.optional() }).optional(),
  awakenTarget: z.number().int().min(0).max(6).optional(),
  teamComps: z
    .array(z.object({ name: text.optional(), members: z.array(slug).min(1), note: text.optional() }))
    .default([]),
  notes: text.optional(),
  source,
});

/**
 * Link Chain — ของที่คราฟต์แล้วผูกกับ Monsterling หนึ่งตัว
 * พอใส่ Monsterling ตัวนั้น มันจะออกมาช่วยรบตามเงื่อนไขที่กำหนด
 */
export const linkChain = z.object({
  id: slug,
  name: text,
  /** Monsterling ที่ผูกอยู่ — ต้องเป็น slug ที่สมุดภาพมอนจองไว้ */
  monsterlingId: slug,
  /** จำนวนเพชร ◆ บนการ์ด */
  rarity: z.number().int().min(1).max(6).optional(),

  /**
   * เก็บเฉพาะเลเวลที่เห็นจริงในเกม
   * เลเวลที่อัปข้ามไปแล้วย้อนกลับไปดูไม่ได้ = ไม่มีในลิสต์นี้ ไม่ใช่ค่าศูนย์
   * ห้ามเดาค่าเลเวลที่ขาดด้วยการคำนวณจากเลเวลอื่น
   */
  levels: z
    .array(
      z.object({
        /** เพดานคือ 5 — ยืนยันจากในเกม (Lv5 ขึ้น "Max Enhancement Tier Reached!") */
        level: z.number().int().min(1).max(5),
        desc: text.optional(),
        damageType: vocabEnum("damageType").optional(),
        /** บางชิ้นมีหลายเงื่อนไข เช่น Poisoned Claw ออกได้ทั้ง Air Counter และ Evasion Counter */
        appearanceConditions: z.array(text).min(1),
        appearanceInfo: z.object({
          dmgPercentOfAtk: z.number().positive().optional(),
          cooldownSec: z.number().positive().optional(),
          note: text.optional(),
        }),
        /** บางชิ้นติดหลายเอฟเฟกต์พร้อมกัน เช่น Frozen Gem ให้ทั้ง Ice Affliction และ Freeze */
        bonusEffects: z.array(text).min(1).optional(),
      }),
    )
    .min(1),

  images: z.object({ icon: z.string().optional() }).optional(),
  source,
}).refine(
  (c) => new Set(c.levels.map((l) => l.level)).size === c.levels.length,
  { message: "มีเลเวลซ้ำกันใน levels" },
);

/**
 * หนึ่งแถวในสมุดภาพมอน — เก็บแค่เลขกับชื่อ ยังไม่ใช่ข้อมูลเต็มของ Monsterling
 * slug เป็น null ได้ เพราะยังไม่รู้ชื่ออังกฤษทางการ และ id ของเว็บห้ามเปลี่ยนทีหลัง
 */
export const monsterDexEntry = z.object({
  /** เกมแยกสมุดหลายเล่ม และแต่ละเล่มเริ่มนับ No.1 ใหม่ — เลขจึงไม่ซ้ำเฉพาะในเล่มเดียวกัน */
  book: vocabEnum("dexBook"),
  no: z.number().int().positive(),
  /**
   * id ถาวรของเว็บ ตั้งจากชื่ออังกฤษทางการ
   * null = ยังไม่ได้ชื่ออังกฤษ จึงยังไม่ตั้ง — ไม่ใช่ลืม เพราะตั้งแล้วห้ามเปลี่ยน
   */
  slug: slug.nullable(),
  name: text,
  /** ภาษาที่ชื่อยังถูก UI ของเกมตัดท้าย เช่น ["en"] — ต้องแคปใหม่ */
  truncated: z.array(z.enum(["th", "en"])).optional(),
});

/** หมวด -> schema ที่ใช้ตรวจ ใช้ร่วมกันระหว่าง validate:data และตัวโหลดข้อมูลของเว็บ */
export const SCHEMAS = {
  characters: character,
  artifacts: artifact,
  equipment: equipment,
  monsterlings: monsterling,
  "link-chains": linkChain,
  food: food,
  builds: build,
} as const;

export type Collection = keyof typeof SCHEMAS;
export type Character = z.infer<typeof character>;
export type Build = z.infer<typeof build>;
