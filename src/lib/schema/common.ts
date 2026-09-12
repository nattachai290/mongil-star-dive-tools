import { z } from "zod";
import { vocabEnum } from "../vocabulary";

/**
 * ข้อความสองภาษา — ต้องมีอย่างน้อยหนึ่งภาษา
 * ไม่บังคับ th ครบทุกช่อง เพราะข้อมูลมาจากเกมเป็นอังกฤษก่อนเสมอ
 * validate:data จะนับช่องที่ยังไม่มี th ไว้เป็น "คำเตือน" ไม่ใช่ error
 */
export const text = z
  .object({ th: z.string().min(1).optional(), en: z.string().min(1).optional() })
  .refine((t) => Boolean(t.th || t.en), { message: 'ต้องมีข้อความอย่างน้อยหนึ่งภาษา ("th" หรือ "en")' });

export const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น");

/**
 * ที่มาของข้อมูล — ทุก entity ต้องมี ไม่มีข้อยกเว้น
 * fieldsUnverified คือรายการฟิลด์ที่ยังไม่ได้ยืนยันในเกม หน้าเว็บและการวิเคราะห์
 * ต้องกำกับเสมอว่าค่านั้นยังไม่ยืนยัน
 */
export const source = z.object({
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ต้องเป็นรูปแบบ YYYY-MM-DD"),
  gameVersion: z.string().min(1),
  by: z.string().optional(),
  fieldsUnverified: z.array(z.string()).optional(),
  /** บันทึกที่มา เช่น อ่านจากภาพไหน หรือมีสองแหล่งที่ขัดกัน — ไม่ใช่ข้อมูลเกม */
  note: z.string().min(1).optional(),
});

/**
 * เอฟเฟกต์ — โครงเดียวใช้ทุก entity (สกิล, Artifact, Equipment, เซ็ต, Monsterling, อาหาร)
 * เพราะทั้งหมดคือ "สิ่งที่บวกเข้าตัวละคร" จึงรวมบัฟทั้งหมดด้วยโค้ดชุดเดียวได้
 */
export const effect = z
  .object({
    kind: vocabEnum("effectKind"),
    stat: vocabEnum("stat").optional(),
    value: z.number().optional(),
    unit: vocabEnum("unit").optional(),
    target: vocabEnum("target"),
    trigger: vocabEnum("trigger"),
    element: vocabEnum("element").optional(),
    durationSec: z.number().positive().optional(),
    /** ติดคูลดาวน์ในตัว เช่น "ทำงาน 1 ครั้ง ทุก 20 วินาที" — ต่างจาก durationSec */
    internalCooldownSec: z.number().positive().optional(),
    maxStacks: z.number().int().positive().optional(),
    condition: z
      .object({
        hpBelowPercent: z.number().min(0).max(100).optional(),
        minStacks: z.number().int().positive().optional(),
        /**
         * true = เฉพาะมอนสเตอร์บอส, false = เฉพาะมอนสเตอร์ทั่วไป
         * ไม่ใส่ = ไม่จำกัด ต้องแยกจาก false ให้ชัด
         */
        vsBoss: z.boolean().optional(),
        /**
         * ธาตุของ "การโจมตีที่ไปกระตุ้น" ไม่ใช่ธาตุของผลลัพธ์
         * เช่น "เมื่อโจมตีธาตุไฟด้วยสกิลพิเศษ" → triggerElement: fire
         * ส่วนธาตุของผลลัพธ์อยู่ที่ effect.element ซึ่งอาจคนละธาตุกัน
         */
        triggerElement: vocabEnum("element").optional(),
        /** ต้องโจมตีโดนกี่ครั้งก่อนถึงทำงาน เช่น "โจมตีพื้นฐานโดน 10 ครั้ง" */
        hitCount: z.number().int().positive().optional(),
        /**
         * ธาตุของ "ศัตรูที่ถูกโจมตี" เช่น "เมื่อโจมตีมอนสเตอร์ธาตุไฟ 10 ครั้ง"
         * คนละอันกับ triggerElement ซึ่งเป็นธาตุของการโจมตีฝั่งเรา
         */
        enemyElement: vocabEnum("element").optional(),
        note: text.optional(),
      })
      .optional(),
  })
  .refine((e) => e.kind === "utility" || e.stat !== undefined, {
    message: 'ต้องระบุ "stat" ยกเว้นตอน kind เป็น "utility"',
  })
  .refine((e) => e.value === undefined || e.unit !== undefined, {
    message: 'ถ้ามี "value" ต้องมี "unit" ด้วย ไม่งั้นไม่รู้ว่าเป็น % หรือค่าคงที่',
  })
  .refine((e) => e.trigger !== "hpBelow" || e.condition?.hpBelowPercent !== undefined, {
    message: 'trigger "hpBelow" ต้องมี condition.hpBelowPercent',
  });

export const statValue = z.object({
  stat: vocabEnum("stat"),
  value: z.number(),
  unit: vocabEnum("unit"),
});

export type Effect = z.infer<typeof effect>;
export type LocalizedText = z.infer<typeof text>;
