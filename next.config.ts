import type { NextConfig } from "next";

/**
 * build เป็นไฟล์ static ล้วนใน out/ แล้วขึ้น GitHub Pages (docs/DEPLOY.md)
 *
 * GitHub Pages ของ repo อยู่ใต้ /<ชื่อ repo>/ จึงต้องมี basePath
 * workflow pages.yml ส่ง NEXT_PUBLIC_BASE_PATH มาให้ ส่วนตอน dev ในเครื่องเว้นว่าง เว็บอยู่ที่ /
 * ชื่อตัวแปรขึ้นต้น NEXT_PUBLIC_ เพราะ asset() ใน src/lib/base-path.ts ต้องอ่านค่าเดียวกันตอนเรนเดอร์
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  // /th/characters/ → th/characters/index.html ซึ่ง GitHub Pages เสิร์ฟให้เองโดยไม่ต้องตั้งค่าอะไร
  trailingSlash: true,
  images: {
    // ไม่มีเซิร์ฟเวอร์ให้แปลงรูปตอนเปิดหน้า — รูปทั้งหมดถูกย่อเป็น webp ไว้แล้ว (docs/PLAN.md §6)
    unoptimized: true,
  },
};

export default nextConfig;
