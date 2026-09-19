"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import { FacetFilters, useFacetFilter, type FacetGroup } from "./FacetFilters";

export type EquipmentRow = {
  key: string;
  /** ค่าที่ใช้กรอง คิดมาจากฝั่งเซิร์ฟเวอร์แล้ว ที่นี่เทียบสตริงล้วน */
  facets: Record<string, string[]>;
  haystack: string;
  /** ระดับใช้จัดกลุ่มด้วย ไม่ได้ใช้แค่กรอง */
  grade: string;
  gradeLabel: string;
  /**
   * การ์ดถูก render มาจากฝั่งเซิร์ฟเวอร์แล้ว เบราว์เซอร์จึงไม่ต้องรับพจนานุกรม
   * ทั้งก้อนไปเพียงเพื่อแสดงชื่อ stat กับชื่อธาตุ — วิธีเดียวกับที่หน้าตัวละครใช้
   *
   * ตัวการ์ดเป็น <li> อยู่แล้ว ที่นี่จึงวางลง <ul> ตรง ๆ ห้ามห่อ <li> ซ้อนอีกชั้น
   */
  card: ReactNode;
};

export function EquipmentList({
  rows,
  facets,
  labels,
}: {
  rows: EquipmentRow[];
  facets: FacetGroup[];
  labels: {
    search: string;
    matches: string;
    noMatch: string;
    filters: string;
    any: string;
    clear: string;
  };
}) {
  const { shown, query, activeCount } = useFacetFilter(rows, facets);

  // จัดกลุ่มหลังกรอง เพื่อให้ระดับที่ไม่มีผลลัพธ์หายไปทั้งหัวข้อ ไม่เหลือหัวข้อโล่ง ๆ
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: EquipmentRow[] }>();
    for (const row of shown) {
      const group = map.get(row.grade) ?? { label: row.gradeLabel, rows: [] };
      group.rows.push(row);
      map.set(row.grade, group);
    }
    return [...map.values()];
  }, [shown]);

  return (
    <>
      <FacetFilters
        idPrefix="equipment"
        facets={facets}
        labels={labels}
        query={query}
        activeCount={activeCount}
        shownCount={shown.length}
      />

      {groups.length === 0 && <p className="mt-8 text-sm text-muted">{labels.noMatch}</p>}

      {groups.map((group) => (
        <section key={group.label} className="mt-8">
          <h2 className="font-display text-sm font-semibold text-ink-2">
            {group.label}{" "}
            <span className="font-mono text-xs font-normal text-muted">{group.rows.length}</span>
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {group.rows.map((row) => (
              <Fragment key={row.key}>{row.card}</Fragment>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
