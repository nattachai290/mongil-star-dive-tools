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
   * ความหายากเป็น "จำนวนดาว" ของตัวละคร ไม่ใช่ R/SR/SSR
   *
   * ⚠️ ดาวแถวใต้ชื่อบนจอ Info **ไม่ใช่ค่านี้** — นั่นคือดาวของการอัปเลเวล
   * Verna: Summer Dive! เลเวล 60 เต็มขึ้นสี่ดวง แต่ตัวละครเป็น 5 ดาว (ผู้เล่นบอก 2026-10-22)
   * (คำพวกนั้นเป็นของที่ร่างไว้ก่อนเห็นเกมจริง เกมนี้ไม่มีใช้เลย)
   *
   * เกมมีตัวละคร 4 ดาวกับ 5 ดาวเท่านั้น — ค่าอื่นคืออ่านจอผิด
   * (ลิงก์เชนใช้ช่วงคนละแบบ ของนั้นเจอตั้งแต่ 3 ดาว)
   */
  rarity: z.number().int().min(4).max(5).optional(),
  // ไม่ใส่ = ยังไม่รู้แรงก์ (ดาวบนจอ Info ไม่ใช่แรงก์ ต้องมีคนบอกหรือมีจออื่นยืนยัน)
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
      /**
       * ช่องที่หก — สกิลธาตุ เห็นครั้งแรกที่ Verna: Summer Dive! (2026-10-22)
       * จอเรียกหัวช่องตามธาตุ ("Guidance of Fire") เลเวลขึ้นตาม Elemental Blessing
       * ("Every time the Elemental Blessing reaches a specific level, your skill level increases.")
       * ไม่มีตารางค่า ตัวเลขอยู่ในประโยคเลย จึงเก็บเป็น effects ของเลเวลที่เห็น
       */
      elemental: skill.optional(),
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

/**
 * Artifact — โครงตามจอ Artifact Preview จริง (เห็นครั้งแรก 2026-10-22)
 *
 * ร่างแรกยืม grade / mainStat ของอุปกรณ์มาก่อนเห็นจอ แต่จอจริงไม่มีระดับสี
 * มีดาวบนการ์ด บทบาทที่ใส่ได้ ค่าสเตตัสสองบรรทัด และเอฟเฟกต์ที่ผูกกับระดับ Fusion
 */
export const artifact = z.object({
  id: slug,
  name: text,
  /** เพชรเล็กบนการ์ด ผู้เล่นเรียกว่าดาว ("artifact 4 ดาว") */
  stars: z.number().int().min(1).max(5).optional(),
  /** บทบาทใต้คำว่า Artifacts บนการ์ด — เอฟเฟกต์ทำงานเฉพาะตอนตัวละครบทบาทนี้ใส่ */
  role: vocabEnum("role"),
  /** เลเวลของ Artifact ตอนอ่านค่า stats — เก็บที่ 60 (ผู้เล่นกำหนด 2026-10-22 "ค่าสเตตัส ให้เอาเวล 60") */
  level: z.number().int().positive(),
  /** ค่าสเตตัสใต้กล่องเอฟเฟกต์ ตามลำดับบนจอ — บรรทัดแรกเป็น ATK แบบค่าคงที่ทุกชิ้นเท่าที่เห็น */
  stats: z.array(statValue).min(1),
  /**
   * กล่อง "Fusion Level N" — หนึ่งรายการต่อหนึ่งจอที่เห็น (ปุ่ม Min / Max สลับจอ Lv.1 กับ Lv.60)
   *
   * ชื่อเอฟเฟกต์ลงท้ายด้วยเลขโรมันตามจอ ("Fanfare! V") เก็บตามที่พิมพ์ ไม่ตัดออก
   * ผู้เล่นกำหนด 2026-10-22: **5 ดาวเก็บ Fusion 1 (จอ Lv.01) กับ Fusion 5 (จอ Lv.60)**
   * **4 ดาวเก็บ Fusion 5 อย่างเดียว** ไม่ต้องไล่จอ Lv.01
   * ส่วน stats ด้านบนเก็บที่ Lv.60 อย่างเดียว
   * name เว้นได้ เพราะจอ Lv.60 ของ Artifact 5 ดาวที่ส่งมาถูกเลื่อนลงจนหัวกล่องพ้นจอ
   */
  fusion: z
    .array(
      z.object({
        /** เลเวลของ Artifact บนการ์ดตอนอ่านกล่องนี้ (01 หรือ 60) */
        artifactLevel: z.number().int().positive(),
        level: z.number().int().positive().optional(),
        name: text.optional(),
        desc: text,
        effects: z.array(effect).default([]),
      }),
    )
    .default([]),
  obtain: z.object({ method: vocabEnum("obtainMethod"), note: text.optional() }).optional(),
  recommendedFor: z.array(slug).default([]),
  images: z.object({ icon: z.string().optional() }).optional(),
  /**
   * ไม่มีช่อง desc — คำพูดตัวเอียงใต้ค่าสเตตัสเป็นคำบรรยาย ไม่เก็บ
   * ตามคำสั่งเดียวกับอุปกรณ์ "เก็บแค่ set effect คำบรรยายไม่เอา" (PLAN §13.7.1)
   */
  source,
}).strict();

export const equipment = z.object({
  id: slug,
  name: text,
  /** สองสีเท่านั้น ม่วงกับทอง ทองดีกว่า — ไม่ใช่ R/SR/SSR ที่เคยร่างไว้ก่อนเห็นเกม */
  grade: vocabEnum("gearGrade"),
  /** จำนวนดาวบนการ์ด เท่าที่เห็นคือ 4 ดาวทั้งหมดในเซ็ตสีม่วง */
  stars: z.number().int().min(1).max(5).optional(),
  slot: vocabEnum("slot"),
  setId: slug.optional(),
  /**
   * ไม่มี mainStat / subStats ในชิ้นอุปกรณ์ แต่ด้วยเหตุผลคนละอย่างกัน
   *
   * **ค่ารอง** สุ่มตอนได้ของมาจริง ("Substats determined upon acquisition")
   * ผูกกับของที่ดรอปแต่ละชิ้น ไม่ผูกกับนิยามของอุปกรณ์ เหตุผลเดียวกับ Trait ของมอน
   *
   * **ค่าหลักไม่สุ่ม** — เข้าใจผิดมาตั้งแต่ 2026-09-15 จนถึง 2026-09-20
   * ป๊อปอัป "ออปชันหลักที่สามารถปรากฏได้" ขึ้นค่าเดียว 100% ทุกช่อง
   * มันผูกกับ (ช่อง x ระดับ) ไม่ใช่กับชิ้น จึงอยู่ที่ data/meta/gear-main-stats.json
   * ไม่ใช่ในไฟล์ของแต่ละชิ้น — ไม่งั้นต้องเขียนเลขเดียวกันซ้ำ 100 ไฟล์
   */
  effects: z.array(effect).default([]),
  /**
   * ไม่มีช่อง desc (คำบรรยายของชิ้น) — ตัดออกจากขอบเขตตามคำสั่งผู้เล่น 2026-10-22
   * "เก็บแค่ set effect คำบรรยายไม่เอา" ดู PLAN §13.7.1
   * ตัดออกจาก schema เลย ไม่ใช่แค่ลบข้อมูล ไฟล์ที่ใส่ desc กลับมาจะไม่ผ่าน validate
   * (คำอธิบายใต้ [Set Effect] ยังเก็บอยู่ที่ sets.json bonuses[].desc คนละเรื่องกัน)
   */
  images: z.object({ icon: z.string().optional() }).optional(),
  source,
}).strict();

/** โบนัสเซ็ต อยู่ใน data/meta/sets.json เพราะเป็นของกลางที่ equipment หลายชิ้นอ้างถึง */
export const equipmentSet = z.object({
  id: slug,
  /** ชื่อที่หัวแผง [Set Effect] — เป็นชื่อของเซ็ตจริง */
  name: text,
  /**
   * ชื่อหัวกลุ่มในแถบซ้ายของจอคราฟต์ ใส่เฉพาะตอนที่ไม่ตรงกับ name
   *
   * ส่วนใหญ่สองที่เขียนเหมือนกัน แต่บางเซ็ตไม่ใช่ และเป็นแบบนั้นทั้งสองภาษา
   * เช่น แถบซ้าย "Worry Crusher" แต่หัวแผงเขียน "Thought Shredder"
   * ชื่อชิ้นมักเดินตามชื่อแถบซ้าย คนที่เห็นแต่จอคราฟต์จึงต้องค้นด้วยชื่อนี้เจอ
   */
  listedAs: text.optional(),
  grade: vocabEnum("gearGrade"),
  stars: z.number().int().min(1).max(5).optional(),
  /**
   * เซ็ตมีกี่ชิ้นทั้งหมด — บางเซ็ตมี 2 ชิ้น บางเซ็ตมี 4
   * เซ็ต 2 ชิ้นจึงมีโบนัสแค่ [2 Set] ส่วนเซ็ต 4 ชิ้นมีทั้ง [2 Set] และ [4 Set]
   */
  pieceCount: z.number().int().min(2).max(6).optional(),
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
  /**
   * ของที่มอนตัวนี้ดรอป — เก็บแค่ชื่อ
   *
   * ยังไม่เก็บจำนวนกับอัตราดรอป เพราะยังไม่เคยเห็นจอที่บอกสองอย่างนั้น
   * ชื่อที่อยู่ในนี้เป็นชื่อของของ ไม่ใช่ id ของ entity อื่น — ของพวกนี้
   * ส่วนใหญ่เป็นวัตถุดิบที่ยังไม่มีไฟล์ของตัวเอง ถ้าวันหลังทำไฟล์วัตถุดิบ
   * ค่อยผูก id เพิ่ม อย่าเพิ่งเดาว่าชื่อไหนตรงกับไฟล์ไหน
   */
  drops: z.array(z.object({ name: text })).default([]),
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

/**
 * คลังลักษณะเฉพาะที่เกมสุ่มใส่มอนแต่ละตัวตอนจับ
 *
 * **นี่คือ "มีอะไรให้สุ่มได้บ้าง" ไม่ใช่ "มอนตัวไหนได้อะไร"** — ห้ามเอาไปแปะไว้ที่
 * ไฟล์มอน เพราะลักษณะเฉพาะสุ่มรายตัวตอนจับ มอนชื่อเดียวกันคนละตัวได้คนละอย่าง
 * เก็บไว้ที่นี่ที่เดียวในฐานะรายการตัวเลือก ดูหมายเหตุท้าย monsterling
 *
 * ไม่เก็บตัวเลข เพราะจอที่อ่านมาเป็นจอฟิลเตอร์ซึ่งบอกแค่ชื่อลักษณะ ไม่บอกค่า
 */
export const traitPool = z.object({
  /** มอนหนึ่งตัวมีกี่ช่อง */
  slots: z.number().int().positive(),
  pool: z
    .array(
      z.object({
        id: slug,
        /** คำที่จอเขียนตรง ๆ — ยังมีแต่ไทย เพราะยังไม่ได้เปิดจอนี้ภาษาอังกฤษ */
        name: text,
        kind: vocabEnum("effectKind"),
        stat: vocabEnum("stat"),
        damageType: vocabEnum("damageType").optional(),
        scopes: z.array(vocabEnum("scope")).nonempty().optional(),
        /** true = เฉพาะบอส, false = เฉพาะมอนทั่วไป, ไม่ใส่ = ไม่จำกัด */
        vsBoss: z.boolean().optional(),
        unit: vocabEnum("unit"),
        /**
         * ค่าของแต่ละแรง — เก็บครบทั้งห้าค่าตามที่อ่านมา ไม่เก็บเป็นสูตร
         *
         * ทั้ง 27 รายการเดินตามกฎเดียวกันคือ ฐาน x ลำดับแรง (เทา 1 ... ทอง 5)
         * แต่กฎนั้นอยู่ใน PLAN ในฐานะข้อสังเกต ไม่ใช่วิธีเก็บ — ถ้าวันหลังมีรายการ
         * ไหนหลุดกฎ ข้อมูลในไฟล์จะยังถูก ส่วนกฎจะพังแทน ซึ่งเป็นทางที่ควรพังกว่า
         */
        values: z.object({
          grey: z.number(),
          green: z.number(),
          blue: z.number(),
          purple: z.number(),
          gold: z.number(),
        }),
      }),
    )
    .min(1),
  source,
});
export type TraitPool = z.infer<typeof traitPool>;

/**
 * ศัตรูที่ดรอปของแต่ "ไม่มีมอนสเตอร์ลิง" — จับไม่ได้ จึงไม่มีหน้าในสมุดภาพ
 *
 * แยกไฟล์จากมอนเพราะมันไม่ใช่มอน ไม่ใช่เพราะข้อมูลยังไม่ครบ — ถ้าวันหลังเจอว่า
 * ตัวไหนมีหน้าในสมุดภาพจริง ให้ย้าย drops ไปไว้ที่ไฟล์มอนแล้วลบออกจากที่นี่
 *
 * ยังไม่ตั้งประเภทให้ (บอส/ศัตรูสนาม/อื่น ๆ) เพราะผู้เล่นบอกแค่ว่าไม่มีมอนสเตอร์ลิง
 * การเดาประเภทเองคือการสร้างข้อมูลที่ไม่มีใครบอกมา
 */
export const dropSources = z.object({
  entries: z
    .array(
      z.object({
        /** คีย์ภายในเท่านั้น ถอดเสียงจากไทย ไม่ใช่ชื่ออังกฤษของเกม ซึ่งยังไม่รู้ */
        id: slug,
        name: text,
        drops: z.array(z.object({ name: text })).min(1),
      }),
    )
    .min(1),
  source,
});
export type DropSources = z.infer<typeof dropSources>;

export const food = z.object({
  id: slug,
  name: text,
  category: vocabEnum("foodCategory"),
  /** ดาวบนการ์ดในจอ Cooking (1–4 เท่าที่เห็น) */
  stars: z.number().int().min(1).max(5).optional(),
  effects: z.array(effect).default([]),
  durationSec: z.number().positive(),
  exquisite: z.object({ effects: z.array(effect).default([]) }).optional(),
  unlock: z.object({ method: vocabEnum("obtainMethod"), note: text.optional() }).optional(),
  images: z.object({ icon: z.string().optional() }).optional(),
  /**
   * ไม่มีช่อง ingredients และ goldCost — ตัดออกจากขอบเขตตามคำสั่งผู้เล่น 2026-10-22
   * "ชื่อวัตถุดิบ ไม่เก็บ" · "ทองที่ใช้ทำไม่เก็บ"
   * ดู PLAN §13.7.2 · schema ตั้งเป็น .strict() ไฟล์ที่ใส่วัตถุดิบกลับมาจะไม่ผ่าน validate
   */
  source,
}).strict();

/**
 * ของที่ตัวละคร 1 ตัวใส่ ณ ขั้นปลุกพลังหนึ่ง — หน้าเว็บแสดงเป็นแท็บแยกตามขั้น
 * เพราะแต่ละขั้นอาจใช้ของคนละชุดได้ (ผู้เล่นกำหนด 2026-10-24)
 *
 * จำนวนช่องตามเกม: มอน 3 · ลิงก์เชน 1 · มอนตำนาน 1 (แยกจากมอน 3 ตัว) · อาหาร จานหลัก + จานรอง
 * ทีมมี 3 ตัว ทุกตัวมีของครบ · ไม่มีช่องหมายเหตุ (ผู้เล่นกำหนด 2026-10-24)
 */
/** มอน 1 ช่องในบิ้ว — ลักษณะเฉพาะ + แรง เช่น ดาเมจคริติคอล ทอง = +15% (ค่าอ่านจาก meta/traits.json) */
const monSlot = z
  .object({
    id: slug,
    traits: z
      .array(z.object({ id: slug, grade: vocabEnum("monsterRank") }).strict())
      .max(4)
      .default([]),
  })
  .strict();

/** ของที่ตัวละคร 1 ตัวในทีมใส่ */
export const buildMember = z.object({
  characterId: slug,
  artifact: slug.optional(),
  /** ระบุทีละช่อง — โบนัสเซ็ตคิดจากชิ้นที่ใส่ ไม่เก็บซ้ำ */
  equipment: z
    .object({
      headgear: slug.optional(),
      chestpiece: slug.optional(),
      gloves: slug.optional(),
      footwear: slug.optional(),
    })
    .strict()
    .default({}),
  /** มอน 3 ตัว พร้อม Trait ตัวละ 4 ช่อง (meta/traits.json) */
  monsterlings: z.array(monSlot).max(3).default([]),
  linkChain: slug.optional(),
  /** มอนจากสมุดภาพ "มอนสเตอร์ตำนาน" — ช่องของตัวเอง ไม่นับรวมกับมอน 3 ตัว · มี Trait 4 ช่องเหมือนกัน */
  legendary: monSlot.optional(),
}).strict();

/**
 * แท็บ 1 ขั้นปลุกพลัง — ทั้งทีมอยู่ขั้นเดียวกัน แต่ละขั้นใช้ของคนละชุดได้
 * อาหาร 2 จาน (จานหลัก + จานรอง) ใช้ร่วมทั้งทีม (ผู้เล่นเลือก 2026-10-24)
 */
export const buildLoadout = z.object({
  awaken: z.number().int().min(0).max(6),
  food: z.object({ entree: slug.optional(), side: slug.optional() }).strict().default({}),
  /** ตัวแรกคือตัวหลักของบิ้ว · สองร่างของตัวละครเดียวกันอยู่ทีมเดียวกันได้ เพราะเกมนับเป็นคนละตัว */
  members: z.array(buildMember).min(1).max(3),
}).strict();

/**
 * บิ้วทีม 3 ตัว — ทุกตัวมีของครบ เพื่อคิดดาเมจรวมทั้งทีม (ผู้เล่นกำหนด 2026-10-24
 * "เวลาบิ้วต้องดูผลรวมดาเมจของทีมไม่ใช่แค่ตัวเดียว") · ไม่มีชื่อบิ้ว ประเภทเนื้อหา หรือแหล่งที่มา
 * แท็บละ 1 ขั้นปลุกพลัง ขั้นเดียวกันห้ามซ้ำ (validate:data ตรวจ)
 */
export const build = z.object({
  id: slug,
  loadouts: z.array(buildLoadout).min(1),
}).strict();

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
 * ค่าหลักของอุปกรณ์ — ผูกกับ (ช่อง x ระดับ) ไม่ใช่กับชิ้นใดชิ้นหนึ่ง
 *
 * หมวกได้พลังชีวิต เกราะอกได้พลังป้องกัน ถุงมือได้พลังโจมตี
 * รองเท้าได้ความเชี่ยวชาญตามบทบาท — เหมือนกันทุกเซ็ต ทุกชิ้น
 *
 * เก็บเฉพาะค่าที่เลเวลสูงสุด เพราะเป็นตัวเลขที่ใช้วางแผนจริง
 * ค่าที่เลเวลอื่นไม่เก็บ และห้ามคำนวณย้อนจากค่านี้
 */
export const gearMainStat = z.object({
  slot: vocabEnum("slot"),
  grade: vocabEnum("gearGrade"),
  stars: z.number().int().min(1).max(5),
  stat: vocabEnum("stat"),
  /** ค่าที่เลเวลสูงสุด — ยังไม่รู้ว่าเลเวลสูงสุดคือเลเวลอะไร รู้แค่ว่าค่านี้คือตอนนั้น */
  atMaxLevel: z.number().positive(),
  source,
});

/**
 * ตารางออปชันรองของอุปกรณ์ — ผูกกับระดับอย่างเดียว ไม่ผูกกับช่องหรือกับเซ็ต
 *
 * ต่างจากค่าหลักตรงที่อันนี้สุ่มจริง จอจึงบอกเป็น "โอกาส" ไม่ใช่ค่าเดียว 100%
 * แต่ละออปชันมีห้าชั้นค่า และน้ำหนักของชั้นเป็นสัดส่วนคงที่ของโอกาสรวม
 * (50 / 30 / 14 / 5 / 1 เปอร์เซ็นต์ของโอกาสนั้น — ตรงกันทั้ง 11 ออปชัน)
 */
export const gearSubstat = z
  .object({
    grade: vocabEnum("gearGrade"),
    stars: z.number().int().min(1).max(5),
    stat: vocabEnum("stat"),
    /** ต้านทานแยกตามธาตุ ออปชันอื่นไม่มีช่องนี้ */
    damageType: vocabEnum("damageType").optional(),
    unit: vocabEnum("unit"),
    /** โอกาสที่จะได้ออปชันนี้ รวมทุกชั้น */
    chancePercent: z.number().positive().max(100),
    tiers: z
      .array(
        z.object({
          /** ค่าที่เลเวล 1 — ยังไม่รู้ว่าค่ารองโตตามเลเวลหรือไม่ จึงไม่เก็บค่าเลเวลสูงสุด */
          atLevel1: z.number().positive(),
          chancePercent: z.number().positive().max(100),
        }),
      )
      .min(1),
    source,
  })
  .refine(
    (r) => Math.abs(r.tiers.reduce((s, x) => s + x.chancePercent, 0) - r.chancePercent) < 0.0001,
    { message: "โอกาสของชั้นย่อยรวมแล้วไม่เท่ากับ chancePercent" },
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
export type BuildLoadout = z.infer<typeof buildLoadout>;
export type BuildMember = z.infer<typeof buildMember>;
export type LinkChain = z.infer<typeof linkChain>;
export type Monsterling = z.infer<typeof monsterling>;
export type Skill = z.infer<typeof skill>;
export type Equipment = z.infer<typeof equipment>;
export type Artifact = z.infer<typeof artifact>;
export type Food = z.infer<typeof food>;
export type GearMainStat = z.infer<typeof gearMainStat>;
export type GearSubstat = z.infer<typeof gearSubstat>;
export type EquipmentSet = z.infer<typeof equipmentSet>;
