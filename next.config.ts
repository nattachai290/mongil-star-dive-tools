import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // รูปทั้งหมดอยู่ใน public/images/ ที่ผ่านสคริปต์ประมวลผลแล้ว (ดู docs/PLAN.md §6)
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
