import type { LocalizedText } from "./schema/common";

/**
 * หมวดหลักของเว็บ — แหล่งเดียวทั้งเมนูและการ์ดหน้าแรก
 * `ready` จะเปลี่ยนเป็น true เมื่อหน้านั้นถูกสร้างจริง (ดู milestone M2–M5 ใน docs/PLAN.md)
 */
export type Section = {
  slug: string;
  title: LocalizedText;
  blurb: LocalizedText;
  ready: boolean;
};

export const SECTIONS: Section[] = [
  {
    slug: "characters",
    title: { th: "ตัวละคร", en: "Characters" },
    blurb: {
      th: "ค่าพลังพื้นฐาน สกิลทั้ง 5 ท่าพร้อมตัวเลขทุกบรรทัด สถานะที่มอบให้ และปลุกพลังทั้ง 6 ขั้น",
      en: "Base stats, all five skills with every printed value, statuses granted, and the six Awaken stages",
    },
    ready: true,
  },
  {
    slug: "artifacts",
    title: { th: "Artifact", en: "Artifacts" },
    blurb: {
      th: "ค่าสเตตัสตายตัว บทบาทที่ใส่ได้ และเอฟเฟกต์ Fusion ประจำชิ้น",
      en: "Fixed stats, the role that can equip each one, and its Fusion effect",
    },
    ready: true,
  },
  {
    slug: "equipment",
    title: { th: "Equipment", en: "Equipment" },
    blurb: {
      th: "เซ็ตอุปกรณ์ทั้งหมด โบนัสเมื่อใส่ครบ 2 และ 4 ชิ้น และชิ้นที่อยู่ในแต่ละเซ็ต",
      en: "Every gear set, its 2- and 4-piece bonuses, and the pieces in each",
    },
    ready: true,
  },
  {
    slug: "monsterlings",
    title: { th: "Monsterling", en: "Monsterlings" },
    blurb: {
      th: "มอนครบทั้งสมุดภาพ เอฟเฟกต์สายพันธุ์ และสถานะว่าใส่ลิงก์เชนได้หรือไม่",
      en: "The full codex, rank effects, and whether each one takes a link chain",
    },
    ready: true,
  },
  {
    slug: "link-chains",
    title: { th: "ลิงก์เชน", en: "Link Chains" },
    blurb: {
      th: "เงื่อนไขปรากฏตัว ดาเมจเทียบพลังโจมตี คูลดาวน์ และเอฟเฟกต์เพิ่มเติมของทุกใบ",
      en: "Appearance conditions, damage as a share of ATK, cooldowns and bonus effects",
    },
    ready: true,
  },
  {
    slug: "food",
    title: { th: "อาหาร", en: "Food" },
    blurb: {
      th: "จานหลักและจานเคียง บัฟ 30 นาทีของแต่ละจาน และดาว",
      en: "Entrées and sides, each dish's 30-minute buffs and stars",
    },
    ready: true,
  },
  {
    slug: "builds",
    title: { th: "Build", en: "Builds" },
    blurb: {
      th: "ของที่ใส่แยกตามขั้นปลุกพลัง เพื่อนร่วมทีมและมอนที่เพื่อนใส่ และบัฟรวมจากชุดนั้น",
      en: "Gear per Awaken stage, teammates and their monsterlings, and the buffs that setup adds",
    },
    ready: true,
  },
];
