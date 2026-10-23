/**
 * พาธนำหน้าของเว็บ — "/mongil-star-dive-tools" บน GitHub Pages, ว่างตอน dev ในเครื่อง
 *
 * <Link> กับ router เติมให้เองอยู่แล้ว แต่ src ของรูป (ทั้ง <img> และ next/image แบบ unoptimized)
 * Next ไม่เติมให้ ต้องผ่าน asset() ทุกครั้ง ไม่งั้นรูปจะชี้ไปที่รากโดเมนแล้วขึ้น 404
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
