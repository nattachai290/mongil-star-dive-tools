/**
 * ห้าหมวดหลักของเว็บ — ใช้เป็นแหล่งเดียวทั้งเมนูและการ์ดหน้าแรก
 * `ready` จะเปลี่ยนเป็น true เมื่อหน้านั้นถูกสร้างจริง (ดู milestone M2–M5 ใน docs/PLAN.md)
 */
export type Section = {
  slug: string;
  title: string;
  blurb: string;
  ready: boolean;
};

export const SECTIONS: Section[] = [
  {
    slug: "characters",
    title: "ตัวละคร",
    blurb: "สเตตัส สกิลทั้ง 4 พร้อมค่าสเกลเลเวล 1–16 และไทม์ไลน์ Awaken ทั้ง 6 ขั้น",
    ready: false,
  },
  {
    slug: "artifacts",
    title: "Artifact",
    blurb: "ค่าสเตตัสตายตัวและเอฟเฟกต์ประจำชิ้น พร้อมบอกว่าตัวละครไหนควรใส่",
    ready: false,
  },
  {
    slug: "monsterlings",
    title: "Monsterling",
    blurb: "สายพันธุ์ Trait ความสามารถ และแผนผังสูตร Combine",
    ready: false,
  },
  {
    slug: "food",
    title: "อาหาร",
    blurb: "Entree และ Side บัฟ 30 นาที วัตถุดิบที่สลับได้ และค่าเวอร์ชัน Exquisite",
    ready: false,
  },
  {
    slug: "builds",
    title: "Build",
    blurb: "ชุดของที่แนะนำ ลำดับอัปสกิล เป้าหมาย Awaken และทีมที่เข้ากัน",
    ready: false,
  },
];
