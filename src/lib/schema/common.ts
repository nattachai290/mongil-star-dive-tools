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
  /**
   * อ่านจากจอภาษาอะไรมาบ้าง
   *
   * ความหมายคือ "บันทึกไว้ว่าเคยอ่านภาษานี้" ไม่ใช่ "อ่านแค่ภาษานี้" —
   * ภาษาที่ไม่อยู่ในลิสต์แปลว่ายังไม่ได้บันทึก ไม่ได้แปลว่ายืนยันแล้วว่าไม่เคยอ่าน
   * ไม่ใส่เลย = ยังไม่รู้ (ของเก่าที่เก็บก่อนมีช่องนี้)
   *
   * มีไว้เพราะการอ่านอีกภาษาจับผิดได้จริงมาแล้วหลายครั้ง เช่น Freeze 2s/5s
   * ของกรงเล็บย้อมเงาจันทรา และคูลดาวน์ที่ต่างกันของดอกไม้ฟื้นฟูเลือดสองตัว
   */
  readIn: z.array(z.enum(["th", "en"])).nonempty().optional(),
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
    /**
     * kind บอก "ตัวเลขขึ้นหรือลง" ไม่ได้บอก "ดีกับใคร"
     *
     * buff = ค่าขึ้น, debuff = ค่าลง ตามเครื่องหมายที่จอเกมพิมพ์
     * ส่วนใครได้ประโยชน์ดูจาก target — เช่น "เพิ่มดาเมจที่เป้าหมายได้รับ +2%"
     * เป็น buff ใส่ enemy ไม่ใช่ debuff ถึงจะเป็นผลดีกับผู้เล่นก็ตาม
     */
    kind: vocabEnum("effectKind"),
    stat: vocabEnum("stat").optional(),
    value: z.number().optional(),
    unit: vocabEnum("unit").optional(),
    /**
     * ข้อความเกมที่ไม่ได้ระบุผู้รับ (เช่น "ATK increases by 7.7%") ให้ใส่ self
     * — ผู้เล่นกำหนด 2026-10-22 "ถ้าไม่บอกว่าใครก็คือตัวเอง" ดู PLAN §13.11
     */
    target: vocabEnum("target"),
    trigger: vocabEnum("trigger"),
    /** ชนิดดาเมจที่เอฟเฟกต์นี้พูดถึง เช่น "ดาเมจธาตุไฟ" หรือ "ดาเมจกายภาพ" */
    damageType: vocabEnum("damageType").optional(),
    /**
     * เอฟเฟกต์มีผลกับการกระทำแบบไหน เช่น "ดาเมจคริติคอลของสกิลอัลติเมต"
     * = stat critDmg + scopes ["ultimate"]
     *
     * แยกจาก stat โดยตั้งใจ ไม่งั้นต้องมี stat เท่ากับ (ชนิดค่า × ชนิดการกระทำ)
     * ซึ่งบานปลายเป็นหลายสิบคำและเทียบข้ามกันไม่ได้
     *
     * เป็น array เพราะเกมซ้อนขอบเขตได้มากกว่าหนึ่งชั้น เช่น
     * "Ultimate Skill Elemental Weakness DMG" = ["ultimate", "weaknessHit"]
     * เรียงจากกว้างไปแคบตามที่เกมเขียนในภาษาอังกฤษ
     */
    scopes: z.array(vocabEnum("scope")).nonempty().optional(),
    durationSec: z.number().positive().optional(),
    /** ติดคูลดาวน์ในตัว เช่น "ทำงาน 1 ครั้ง ทุก 20 วินาที" — ต่างจาก durationSec */
    internalCooldownSec: z.number().positive().optional(),
    maxStacks: z.number().int().positive().optional(),
    condition: z
      .object({
        hpBelowPercent: z.number().min(0).max(100).optional(),
        minStacks: z.number().int().positive().optional(),
        /**
         * ขอบเขต "ฝั่งผลลัพธ์" — ผลไปลงที่ศัตรูแบบไหน
         * true = เฉพาะมอนสเตอร์บอส, false = เฉพาะมอนสเตอร์ทั่วไป
         * ไม่ใส่ = ไม่จำกัด ต้องแยกจาก false ให้ชัด
         *
         * ถ้าประโยคมีทั้งศัตรูที่ต้องไปตีและศัตรูที่ผลไปลง ให้แยกไปที่
         * triggerVsBoss / triggerEnemyType ดูตัวอย่างที่วิญญาณเด็ก (145)
         */
        vsBoss: z.boolean().optional(),
        /**
         * ศัตรูที่ต้อง "ไปตี" ถึงจะติดเงื่อนไข ไม่ใช่ศัตรูที่ผลไปลง
         * เช่น "เมื่อโจมตีมอนสเตอร์บอส 10 ครั้ง" → triggerVsBoss: true
         */
        triggerVsBoss: z.boolean().optional(),
        /**
         * ชนิดดาเมจของ "การโจมตีที่ไปกระตุ้น" ไม่ใช่ของผลลัพธ์
         * เช่น "เมื่อโจมตีธาตุไฟด้วยสกิลพิเศษ" → triggerDamageType: fire
         * ส่วนชนิดของผลลัพธ์อยู่ที่ effect.damageType ซึ่งอาจคนละอันกัน
         */
        triggerDamageType: vocabEnum("damageType").optional(),
        /**
         * "การกระทำที่ไปกระตุ้น" ไม่ใช่ขอบเขตของผลลัพธ์
         * เช่น "เมื่อโจมตีคริติคอลของสกิลอัลติเมตสำเร็จ จะเพิ่มดาเมจคริติคอล"
         * → trigger onCrit + triggerScope ultimate ส่วนผลลัพธ์เป็นดาเมจคริทุกท่า
         * คนละอันกับ effect.scopes ซึ่งจำกัดว่าผลไปลงที่ท่าไหน
         */
        triggerScope: vocabEnum("scope").optional(),
        /** ต้องโจมตีโดนกี่ครั้งก่อนถึงทำงาน เช่น "โจมตีพื้นฐานโดน 10 ครั้ง" */
        hitCount: z.number().int().positive().optional(),
        /** ต้องกำจัดศัตรูกี่ตัวก่อนถึงทำงาน — คนละอย่างกับ hitCount */
        killCount: z.number().int().positive().optional(),
        /**
         * ชนิดของศัตรูที่ "ผลไปลง" เช่น "เพิ่มดาเมจแก่มอนสเตอร์กายภาพ"
         * ใช้ damageType เพราะรวม physical ด้วย
         * คนละอันกับ triggerDamageType ซึ่งเป็นชนิดของการโจมตีฝั่งเรา
         */
        enemyType: vocabEnum("damageType").optional(),
        /**
         * ชนิดของศัตรูที่ต้อง "ไปตี" ถึงจะติดเงื่อนไข
         * เช่น "เมื่อโจมตีมอนสเตอร์ธาตุลม 10 ครั้ง" → triggerEnemyType: wind
         *
         * เกมมีสองช่องนี้จริง และใส่คำบอกชนิดศัตรูได้ทั้งคู่ในประโยคเดียว
         * เช่น วิญญาณกระรอก (146) "DMG +6.57% against normal enemies
         * for 5s upon attacking Wind enemy 10 times"
         * → triggerEnemyType: wind + hitCount: 10 (ฝั่งกระตุ้น)
         *   กับ vsBoss: false (ฝั่งผล)
         */
        triggerEnemyType: vocabEnum("damageType").optional(),
        /**
         * ศัตรูต้องติด "สถานะอ่อนแอต่อธาตุ" (Affliction) นี้อยู่ ถึงจะติดเงื่อนไข
         * เช่น "upon attacking an enemy with Earth Affliction" -> earth
         *
         * คนละอันกับ triggerEnemyType ซึ่งเป็น "ธาตุของตัวศัตรู" ไม่ใช่สถานะที่ติดอยู่
         * มอนธาตุดินกับมอนที่โดนใส่สถานะอ่อนแอต่อธาตุดิน เป็นคนละเรื่องกันคนละตัวได้
         *
         * และคนละอันกับ enemyState ซึ่งเก็บท่าทาง (ล้ม / ลอย / มึนงง) ไม่ใช่ธาตุ
         */
        triggerEnemyAffliction: vocabEnum("damageType").optional(),
        /** สถานะของศัตรูที่ต้องเป็นก่อนถึงทำงาน เช่น "แก่เป้าหมายที่ล้มอยู่ตรงพื้น" */
        enemyState: vocabEnum("enemyState").optional(),
        /**
         * ยืนยันแล้วว่าคำบอกชนิดศัตรูอยู่ "ฝั่งผล" จริง ไม่ใช่ฝั่งกระตุ้น
         *
         * มีไว้เพื่อปิดคำเตือนของ validate:data ที่เตือนทุกครั้งที่เจอ
         * enemyType/vsBoss มาคู่กับ hitCount/killCount เพราะตอนกรอกครั้งแรกแยกไม่ออก
         * ใส่ได้ต่อเมื่อ "อ่านจอแล้วเห็นว่าคำนั้นเกาะอยู่กับตัวเลขผล ไม่ได้อยู่ในวงเล็บ upon..."
         * เช่น สโปเดอร์ (76) "DMG +6.25% against normal enemies for 5s upon defeating 10 enemies"
         * — normal enemies เกาะกับ DMG ส่วนท่อน upon ไม่ได้ระบุชนิดศัตรูเลย
         *
         * ห้ามใส่จากการเดา ถ้ายังไม่ได้ดูจอ ให้ปล่อยให้มันเตือนต่อไป
         */
        enemyScopeVerified: z.boolean().optional(),
        /**
         * บัฟทีมที่ให้เฉพาะเพื่อนบางแบบ — อ่านจากข้อความเงื่อนไขบนจอ เช่น "all Fire teammates",
         * "Ranged type teammates who are not Ice-type" · เครื่องคิดดาเมจทีมใช้กรองว่าใครได้บัฟ
         */
        teammateElement: vocabEnum("damageType").optional(),
        teammateNotElement: vocabEnum("damageType").optional(),
        teammateRange: vocabEnum("range").optional(),
        /**
         * บัฟนี้ไปลงที่สกิลพิเศษ "ครั้งถัดไป" ซึ่งต้องโดนภายในกี่วินาทีหลังสกิลพิเศษครั้งก่อนโดน
         * คิดจากเงื่อนไขที่ต่อกันบนจอ เช่น คมเยือกแข็งแห่งการพิพากษา: สกิลพิเศษโดน → บัฟ 4 วิ →
         * โจมตีพื้นฐานโดนในช่วงนั้น → ดาเมจสกิลพิเศษ +80% นาน 1.8 วิ → ต้องใช้สกิลพิเศษซ้ำภายใน 4 + 1.8 = 5.8 วิ
         * เครื่องคิดดาเมจตัดบัฟนี้ออกเมื่อคูลดาวน์สกิลพิเศษของตัวละครยาวกว่านี้และสกิลกดต่อไม่ได้
         * (ทดสอบในเกม 2026-10-29: Ophelia ซึ่งกด E ต่อได้ ได้บัฟนี้จริง)
         */
        specialRecastWithinSec: z.number().positive().optional(),
        /**
         * ต้องได้รับ "เอฟเฟกต์เปลี่ยนธาตุโจมตี" ก่อน (เช่น เปลวเพลิงที่ใฝ่ฝันถึงความยุติธรรม)
         * ตัวคำนวณนับให้เฉพาะตัวละครที่มีสกิลเปลี่ยนธาตุการตีปกติ (skill.changesBasicAttackTo)
         */
        requiresAttackElementChange: z.literal(true).optional(),
        /**
         * ใช้กับแถวดาเมจของสกิลที่ชื่อ (อังกฤษ) มีคำนี้เท่านั้น เช่น "Crushing Blow", "Alien Power"
         * สำหรับบัฟที่จอบอกว่าเพิ่มดาเมจของท่าย่อยท่าเดียว ไม่ใช่ทั้งสกิล
         * ตารางค่าพลังรวมไม่นับ (ไม่ได้ใช้กับทั้งท่า) แต่โชว์ในรายการบัฟ
         */
        skillRow: z.string().min(1).optional(),
        /**
         * บัฟทีมที่ให้ "เพื่อน" ไม่รวมตัวเอง เช่น Imperial Grace ของ Nagi ("grants teammates")
         * ตัวคำนวณไม่ส่งบัฟนี้กลับไปให้ตัวที่เป็นเจ้าของ
         */
        teammatesOnly: z.literal(true).optional(),
        /**
         * ทำงานเมื่อตัวที่ใส่ "ได้รับบัฟดาเมจธาตุนี้" (เอฟเฟกต์ ไม่ใช่ค่าพลังติดของ) เช่น หินอัคนีสลักของ ปราณมังกรที่ลุกโชน
         * "gaining a Fire DMG Boost" · ตัวคำนวณตัดออกถ้าไม่มีบัฟดาเมจธาตุนั้นเลย (ผู้เล่นเจอ Ellie ทีมดินได้ ATK +30% 2026-11-01)
         */
        requiresElementBoost: vocabEnum("damageType").optional(),
        /**
         * ทำงานเมื่อตัวที่ใส่ "ได้รับบัฟค่านี้" เป็นเอฟเฟกต์ (ค่าพลังติดตัว/ของไม่นับ) เช่น ปีศาจผู้ปรารถนา
         * "เมื่อเอฟเฟกต์เพิ่มดาเมจกดขี่ปรับใช้" → suppressionDmg (ผู้เล่นบอก 2026-11-01: แบบ Attention Overload ของบรีเซล)
         */
        requiresStatBuff: vocabEnum("stat").optional(),
        /** ทำงานเมื่อตัวที่ใส่ "ได้รับบัฟดาเมจสกิล" (dmgDealt ที่ผูกสกิลพิเศษ/สับเปลี่ยน/อัลติเมต) เช่น Savvy Investment */
        requiresSkillBoost: z.literal(true).optional(),
        /** ตัวที่ใส่ต้องมีสถานะนี้ของตัวเอง (ชื่ออังกฤษใน statuses) เช่น "DMG Immunity" ของ เกล็ดขาวของอสรพิษวารี */
        requiresSelfStatus: z.string().min(1).optional(),
        /** สกิลนี้ของตัวที่ใส่ต้องทำให้ศัตรูติดสถานะนี้ (หาในคำอธิบายอังกฤษ) เช่น สับเปลี่ยน + "Freeze" ของ Stabilized Superconductor */
        requiresSkillInflicts: z
          .object({ skill: z.enum(["basic", "switch", "special", "ultimate"]), status: z.string().min(1) })
          .optional(),
        /** ตัวที่ใส่ต้องเป็นระยะนี้ เช่น "if the equipping character is a Ranged type" */
        holderRange: vocabEnum("range").optional(),
        /**
         * ตรวจแล้ว: เงื่อนไขในข้อความเป็นสิ่งที่ตัวที่ใส่ทำได้เอง (เช่น "เมื่อใช้สกิลพิเศษ") นับตลอดได้
         * ตัวตรวจข้อมูลเตือนเอฟเฟกต์ของอาร์ติแฟกต์/เซ็ต/มอน/ลิงก์เชนที่มีเงื่อนไขเป็นข้อความอย่างเดียวและยังไม่ได้ตรวจ
         * (กันไม่ให้นับบัฟที่ตัวนั้นทำไม่ได้แบบหินอัคนีสลัก 2026-11-01)
         */
        selfMet: z.literal(true).optional(),
        /**
         * ค่าของเอฟเฟกต์แปลงจากค่าอื่นของ "เจ้าของเอฟเฟกต์" = ค่าต้นทาง × ratio% แต่ไม่เกิน value (ค่าสูงสุดบนจอ · ไม่มีเพดาน = ไม่ใส่ value)
         * stat ต้นทาง: dmgDealt + damageType (ดาเมจธาตุที่ได้รับ) · critRate · critDmg · hp (ค่าพลังรวม) · ดาเมจบทบาท (supportDmg ฯลฯ)
         * เช่น แพสซีฟ Francis: Summer Dive! "ATK increases by an amount equal to any received Earth DMG Boosts" สูงสุด 25%
         *   → stat atk · value 25 · convertFrom { stat: dmgDealt, damageType: earth, ratio: 100 }
         * บัฟทีม (เช่น Vivian ให้ทีม ATK ตามดาเมจกดดันของ Vivian) ใช้ค่าของเจ้าของ ไม่ใช่ของคนที่ได้รับ
         */
        convertFrom: z
          .object({
            stat: vocabEnum("stat"),
            damageType: vocabEnum("damageType").optional(),
            /** % ของค่าต้นทาง เช่น 30 = 30% · Reina "0.1% ต่อ HP 100" = 0.1 (ต่อ HP 1 = 0.001%) */
            ratio: z.number().positive(),
          })
          .optional(),
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
  /** ธาตุของสเตตัสแบบ "Fire DMG Boost" — stat เป็น dmgDealt แล้วระบุธาตุตรงนี้ */
  damageType: vocabEnum("damageType").optional(),
  value: z.number(),
  unit: vocabEnum("unit"),
});

export type Effect = z.infer<typeof effect>;
export type LocalizedText = z.infer<typeof text>;
