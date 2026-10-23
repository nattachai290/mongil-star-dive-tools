import type { FacetGroup } from "@/components/FacetFilters";

/**
 * ตัวเลือกในดรอปดาวน์มาจากค่าที่มีจริงในข้อมูล ไม่ใช่จากพจนานุกรมทั้งกลุ่ม
 * เรียงตามจำนวนมากก่อน — ยกเว้นส่งตัวเรียงเองมา (เช่น ดาว เรียงจากมากไปน้อยตามตัวเลข)
 */
export function optionsFrom(
  rows: { facets: Record<string, string[]> }[],
  key: string,
  toLabel: (v: string) => string,
  order?: (a: string, b: string) => number,
): FacetGroup["options"] {
  const count = new Map<string, number>();
  for (const row of rows) {
    for (const v of new Set(row.facets[key] ?? [])) count.set(v, (count.get(v) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => (order ? order(a[0], b[0]) : b[1] - a[1] || a[0].localeCompare(b[0])))
    .map(([value, n]) => ({ value, label: toLabel(value), count: n }));
}

/** ดาวเรียงจากมากไปน้อยตามตัวเลข ไม่ใช่ตามจำนวนของ */
export const byNumberDesc = (a: string, b: string) => Number(b) - Number(a);

/** ข้อความค้นหา — รวมทั้งสองภาษาเสมอ ไม่งั้นพิมพ์ค้างไว้แล้วสลับภาษาจะหาไม่เจอ */
export function haystackOf(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}
