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
      th: "ค่าพลังเปล่า สกิลทั้ง 5 ท่าพร้อมตัวเลขทุกบรรทัด สถานะที่มอบให้ และปลุกพลังทั้ง 6 ขั้น",
      en: "Base stats, all five skills with every printed value, statuses granted, and the six Awaken stages",
    },
    ready: true,
  },
  {
    slug: "artifacts",
    title: { th: "Artifact", en: "Artifacts" },
    blurb: {
      th: "ค่าสเตตัสตายตัวและเอฟเฟกต์ประจำชิ้น พร้อมบอกว่าตัวละครไหนควรใส่",
      en: "Fixed stats and per-piece effects, with who should equip them",
    },
    ready: false,
  },
  {
    slug: "equipment",
    title: { th: "Equipment", en: "Equipment" },
    blurb: {
      th: "ของสวมใส่ 4 ช่อง ค่าหลัก ค่ารอง และโบนัสเมื่อใส่ครบเซ็ต",
      en: "Four gear slots, main and sub stats, and set bonuses",
    },
    ready: false,
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
      th: "Entree และ Side บัฟ 30 นาที วัตถุดิบที่สลับได้ และค่าเวอร์ชัน Exquisite",
      en: "Entrees and sides, 30-minute buffs, swappable ingredients and Exquisite values",
    },
    ready: false,
  },
  {
    slug: "builds",
    title: { th: "Build", en: "Builds" },
    blurb: {
      th: "ชุดของที่แนะนำ เป้าหมาย Awaken ทีมที่เข้ากัน และตัวเลขดาเมจที่คำนวณจากชุดนั้น",
      en: "Recommended gear, Awaken targets, team comps and damage computed from that setup",
    },
    ready: false,
  },
];
