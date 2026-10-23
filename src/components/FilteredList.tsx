"use client";

import { Fragment, type ReactNode } from "react";
import { FacetFilters, useFacetFilter, type FacetGroup, type FacetLabels, type FacetRow } from "./FacetFilters";

export type FilteredRow = FacetRow & {
  key: string;
  /**
   * การ์ดถูก render มาจากฝั่งเซิร์ฟเวอร์แล้ว — เหตุผลเดียวกับ EquipmentList
   * ตัวการ์ดเป็น <li> อยู่แล้ว ที่นี่จึงวางลง <ul> ตรง ๆ
   */
  card: ReactNode;
};

/** ตัวกรอง + รายการแบบไม่จัดกลุ่ม ใช้ร่วมกันในหน้าตัวละคร Artifact และลิงก์เชน */
export function FilteredList({
  idPrefix,
  rows,
  facets,
  labels,
  listClassName,
}: {
  idPrefix: string;
  rows: FilteredRow[];
  facets: FacetGroup[];
  labels: FacetLabels & { noMatch: string };
  listClassName: string;
}) {
  const { shown, query, activeCount } = useFacetFilter(rows, facets);

  return (
    <>
      <FacetFilters
        idPrefix={idPrefix}
        facets={facets}
        labels={labels}
        query={query}
        activeCount={activeCount}
        shownCount={shown.length}
      />
      {shown.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{labels.noMatch}</p>
      ) : (
        <ul className={listClassName}>
          {shown.map((row) => (
            <Fragment key={row.key}>{row.card}</Fragment>
          ))}
        </ul>
      )}
    </>
  );
}
