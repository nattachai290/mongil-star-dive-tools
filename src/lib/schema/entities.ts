import { z } from "zod";
import { vocabEnum } from "../vocabulary";
import { effect, slug, source, statValue, text } from "./common";

/** ค่าสเกลของสกิลทั้ง 16 เลเวล — null คือยังไม่ได้เก็บค่านั้น ไม่ใช่ศูนย์ */
const scaling16 = z
  .array(z.number().nullable())
  .length(16, "ต้องมี 16 ช่อง (เลเวล 1–16) ช่องที่ยังไม่รู้ค่าให้ใส่ null");

/**
 * ตัวเลขหนึ่งบรรทัดบนจอสกิล
 *
 * label เก็บตามที่จอเขียน ยังไม่ทำเป็นคำศัพท์เพราะเห็นตัวละครเดียว
 * ถ้าตัวที่สองใช้ชื่อบรรทัดชุดเดียวกัน ค่อยย้ายเข้าพจนานุกรม
 */
const skillValue = z.object({
  label: text,
  unit: vocabEnum("unit"),
  scaling: scaling16,
  /**
   * บรรทัดนี้เป็นตัวเลขของคำอธิบายท่อนที่เท่าไหร่ (นับจาก 1)
   *
   * เกมคั่นคำอธิบายด้วย "/" อยู่แล้ว แต่ไม่ได้บอกว่าตัวเลขบรรทัดไหนคู่กับท่อนไหน
   * ช่องนี้จึงเป็น "การอ่านของคนกรอก" ไม่ใช่สิ่งที่จอเขียนไว้ตรง ๆ
   * ใส่ได้ก็ต่อเมื่อชื่อบรรทัดกับท่อนนั้นใช้คำเฉพาะร่วมกันจนไม่มีทางตีความเป็นอย่างอื่น
   * เช่น "ดาเมจโพลแดนซ์จากสกิลสนับสนุน" กับท่อนที่พูดถึงการเต้นโพลแดนซ์
   *
   * ไม่ใส่ = ยังจับคู่ไม่ได้ หรือเป็นค่าของทั้งสกิลไม่ใช่ของท่อนใดท่อนหนึ่ง
   * (เช่น คูลดาวน์) — หน้าเว็บจะโชว์แยกไว้ท้ายสุด ไม่ใช่ซ่อนทิ้ง
   */
  line: z.number().int().positive().optional(),
});

export const skill = z.object({
  name: text,
  desc: text,
  /**
   * ชนิดดาเมจของสกิลนี้ — ต้องเก็บรายสกิล ไม่ใช่รายตัวละคร
   *
   * "กายภาพ" คือการตีธรรมดา ตัวละครหลายตัวตีปกติเป็นกายภาพแต่สกิลเป็นธาตุ
   * ถ้าไปยึดธาตุของตัวละครมาคิดดาเมจทุกท่า จะคิดได้เปรียบ/เสียเปรียบธาตุผิดทันที
   *
   * ไม่ใส่ = สกิลนี้ไม่สร้างดาเมจ (เช่น บัฟล้วน) ไม่ใช่ "ยังไม่รู้"
   */
  damageType: vocabEnum("damageType").optional(),
  /**
   * สกิลนี้เปลี่ยนชนิดดาเมจของ "การโจมตีปกติ" เป็นอะไรหลังใช้
   * เช่น ใช้สกิลแล้วตีธรรมดากลายเป็นธาตุไฟ — ไม่ใส่ = ไม่เปลี่ยน
   */
  changesBasicAttackTo: vocabEnum("damageType").optional(),
  effects: z.array(effect).default([]),
  /**
   * ตัวเลขทุกบรรทัดที่จอสกิลแสดง ทีละบรรทัด
   *
   * ไม่ใช่ค่าเดียวต่อสกิล เพราะท่าเดียวมีได้หลายบรรทัด เช่น โจมตีพื้นฐาน
   * ของวิเวียนมีหกบรรทัด (ขั้น 1–4 · ฉับพลัน · หลบหลีกโต้กลับ) และแพสซีฟ
   * มีทั้งหน่วยวินาทีและเปอร์เซ็นต์ปนกัน
   */
  values: z.array(skillValue).default([]),
});

export const character = z.object({
  id: slug,
  name: text,
  /**
   * ความหายากเป็น "จำนวนดาว" ตามที่จอตัวละครแสดง ไม่ใช่ R/SR/SSR
   * (คำพวกนั้นเป็นของที่ร่างไว้ก่อนเห็นเกมจริง เกมนี้ไม่มีใช้เลย)
   *
   * เกมมีตัวละคร 4 ดาวกับ 5 ดาวเท่านั้น — ค่าอื่นคืออ่านจอผิด
   * (ลิงก์เชนใช้ช่วงคนละแบบ ของนั้นเจอตั้งแต่ 3 ดาว)
   */
  rarity: z.number().int().min(4).max(5),
  /** ระยะการโจมตี เช่น ระยะใกล้ — เพิ่มคำใหม่เมื่อเห็นจากจอเท่านั้น */
  range: vocabEnum("range").optional(),
  /**
   * ธาตุประจำตัวละคร ใช้สำหรับหมวดหมู่และตัวกรองเท่านั้น
   *
   * **ห้ามใช้คิดดาเมจ** — ชนิดดาเมจจริงอยู่ที่ `skills.*.damageType` รายสกิล
   * เพราะตีปกติอาจเป็นกายภาพขณะที่สกิลเป็นธาตุ (ดู PLAN §13.10)
   */
  element: vocabEnum("element"),
  role: vocabEnum("role"),
  tags: z.array(vocabEnum("tag")).default([]),

  /**
   * ค่าพลัง "เปล่า" ของตัวละคร — ห้ามใส่ตัวเลขจากจอที่ติดอุปกรณ์
   * หรือมอนสเตอร์ลิงอยู่ เพราะลักษณะเฉพาะของมอนบวก HP/ATK/DEF เข้าไปด้วย
   * ไม่ใส่ = ยังไม่ได้อ่านค่าเปล่า ไม่ใช่ศูนย์
   */
  stats: z
    .object({
      atLevel: z.number().int().positive(),
      hp: z.number().positive(),
      atk: z.number().positive(),
      def: z.number().positive(),
      /** ฐานของเกมคือ 5 เพดาน 100 (ทูลทิปในเกมบอกไว้) */
      critRate: z.number().min(0).max(100),
      /**
       * เก็บเป็น "ส่วนที่บวกเพิ่ม" ฐานของเกมคือ 50 ไม่ใช่ตัวคูณ 150
       * เพดาน 300 ตามทูลทิป "เมื่อเกิดคริติคอล อัตราเพิ่มปริมาณดาเมจ สูงสุด 300%"
       */
      critDmg: z.number().min(0).max(300),
    })
    .optional(),

  /**
   * บรรทัดที่เหลือของจอ "ข้อมูลรายละเอียดค่าพลัง" ที่ไม่ใช่ห้าค่าหลักข้างบน
   *
   * เก็บเป็น effect ไม่ใช่ช่องใหม่ในก้อน stats เพราะหลายบรรทัดต้องใช้ scope
   * หรือ damageType ถึงจะพูดได้ถูก เช่น "เพิ่มดาเมจสนับสนุน" คือ
   * stat dmgDealt + scopes ["support"] ไม่ใช่ stat ใหม่ชื่อ supportSkillDmg
   * (ดู DATA-FOR-AI "stat กับ scopes แยกกัน")
   */
  otherStats: z.array(effect).default([]),

  /**
   * สถานะที่ตัวละครนี้มอบให้ พร้อมคำอธิบายจากหน้าต่าง "รายละเอียดเอฟเฟกต์"
   *
   * เก็บที่ตัวละครไม่ใช่ในสกิล เพราะสกิลหลายท่าอ้างถึงสถานะเดียวกัน
   * (อ่อนแอต่อไฟ ถูกใช้โดยสกิลสับเปลี่ยนและสกิลอัลติเมต)
   * ถ้าเจอตัวละครตัวอื่นมอบสถานะชื่อเดียวกัน ค่อยย้ายไปเป็นหมวดของตัวเอง
   */
  statuses: z
    .array(
      z.object({
        name: text,
        desc: text,
        /**
         * เติมได้ก็ต่อเมื่อ effects ครอบคำอธิบายได้ "ทั้งหมด" เท่านั้น
         * ถ้าเติมได้แค่บางส่วน ให้ปล่อยว่างแล้วอ่านจาก desc แทน
         * ไม่งั้นจะดูเหมือนเก็บครบทั้งที่ยังขาด
         *
         * target self หมายถึงตัวที่กำลังติดสถานะนี้ ไม่ใช่คนที่มอบให้
         */
        effects: z.array(effect).default([]),
      }),
    )
    .default([]),

  /** ข้อมูลมาทีละจอ ตัวละครที่ยังอ่านสกิลไม่ครบก็ต้องเก็บชื่อกับธาตุไว้ก่อนได้ */
  skills: z
    .object({
      basic: skill,
      switch: skill,
      special: skill,
      ultimate: skill,
      /** ช่องที่ห้าบนจอสกิล ไม่ได้กดใช้เอง ทำงานเองตลอด */
      passive: skill.optional(),
    })
    .partial()
    .optional(),

  /**
   * ปลุกพลัง — ระบบเสริมพลังตัวละครด้วย "ตัวซ้ำ" หกขั้น
   *
   * เกมนี้ไม่มีระบบทะลุจำกัดแยกต่างหาก ตอนแรกมีช่อง breakthrough อยู่ด้วย
   * แต่เป็นของที่ร่างไว้ก่อนเห็นเกมจริง ชุดเดียวกับ R/SR/SSR — ถอดออกแล้ว
   */
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
   * "เอฟเฟกต์สายพันธุ์" ในเกม — ผูกกับสายพันธุ์ ไม่ใช่ตัวที่จับมาแต่ละตัว
   * (ต่างจาก "ลักษณะเฉพาะ" ที่สุ่มรายตัว จึงไม่เก็บ ดูหมายเหตุท้ายไฟล์)
   */
  speciesEffects: z.array(effect).default([]),
  /**
   * แรงของมอนที่อ่านค่า speciesEffects มา — ต้องมีคู่กันเสมอ
   *
   * ตัวเลขขึ้นกับ "แรง" เท่านั้น (เทา → เขียว → ฟ้า → ม่วง → ทอง)
   * **เลเวลไม่เกี่ยว** — แรงเดียวกันได้ค่าเท่ากันทุกเลเวล จึงไม่เก็บเลเวลไว้ที่นี่
   * เพราะจะทำให้เข้าใจผิดว่าต้องเลเวลเท่านั้นถึงได้ค่านี้ (ดู PLAN §13.9)
   *
   * ไม่ใส่ = ยังไม่รู้แรง ไม่ใช่ "แรงต่ำ" — เว็บแสดงเฉพาะค่าจากตัวสีทอง
   */
  effectsRank: vocabEnum("monsterRank").optional(),
  obtain: z.object({ method: vocabEnum("obtainMethod"), note: text.optional() }).optional(),
  images: z.object({ icon: z.string().optional() }).optional(),
  source,
}).refine(
  // แรงจำเป็นเฉพาะตอนมี "ตัวเลข" เพราะตัวเลขเท่านั้นที่ขึ้นกับแรง
  // ส่วนรูปแบบเอฟเฟกต์ (กระตุ้นด้วยอะไร ให้ผลอะไร) เป็นของสายพันธุ์ ไม่ขึ้นกับแรง
  (m) => !m.speciesEffects.some((e) => e.value !== undefined) || m.effectsRank !== undefined,
  { message: "speciesEffects มีตัวเลขแล้วต้องบอก effectsRank ว่าอ่านมาจากมอนแรงอะไร" },
);

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
  /**
   * เกมแยกเป็นสองแท็บ และสายตำนานใช้คำเรียกคนละชุด
   * ([Specific Condition] / [Divine Beast Info] แทน [Appearance ...])
   * ทั้งยังไม่มีคูลดาวน์ และบัฟอยู่ยาวจนจบเบิร์สแทนที่จะนับวินาที
   */
  kind: vocabEnum("linkChainKind").default("monsterling"),
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
        /**
         * ไม่มีช่อง desc — ข้อความบรรยายท่าอยู่นอกขอบเขต (PLAN §13.7)
         * ตัดออกจาก schema ไปเลย ไม่ใช่แค่ลบข้อมูล ไม่งั้นเดี๋ยวมีคนใส่กลับมาอีก
         */
        damageType: vocabEnum("damageType").optional(),
        /**
         * เงื่อนไขเป็นคำในพจนานุกรม ไม่ใช่ข้อความอิสระ — ชิ้นที่ออกด้วยเงื่อนไขเดียวกัน
         * จะใช้คำเดียวกันเสมอ จึงกรองบนเว็บได้ และแปลไทยที่เดียวใช้ได้ทุกชิ้น
         * เป็นลิสต์เพราะบางชิ้นออกได้หลายทาง เช่น Air Counter หรือ Evasion Counter
         */
        appearanceConditions: z.array(vocabEnum("appearanceCondition")).min(1),
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
export type LinkChain = z.infer<typeof linkChain>;
export type Monsterling = z.infer<typeof monsterling>;
export type Skill = z.infer<typeof skill>;
