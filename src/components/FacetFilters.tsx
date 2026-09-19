"use client";

import { useMemo } from "react";
import { clearParams, useSearchParamsFromUrl, useSearchString, writeParam } from "./url-state";

const QUERY_KEY = "q";

export type FacetGroup = {
  /** ชื่อช่องใน row.facets */
  key: string;
  /** ชื่อพารามิเตอร์ใน URL — สั้นกว่า key เพื่อให้ลิงก์ที่ก็อปไปอ่านง่าย */
  param: string;
  legend: string;
  options: { value: string; label: string; count: number }[];
};

/** ทุกหน้าที่ใช้ตัวกรองนี้ต้องคิดค่าที่กรองได้และข้อความที่ค้นได้มาจากฝั่งเซิร์ฟเวอร์ */
export type FacetRow = {
  facets: Record<string, string[]>;
  haystack: string;
};

export type FacetLabels = {
  search: string;
  matches: string;
  filters: string;
  any: string;
  clear: string;
};

/**
 * กรองแถวตามคำค้นและดรอปดาวน์ โดยอ่าน URL เป็นแหล่งความจริงเดียว
 *
 * snapshot ที่ useSyncExternalStore คืนมาเป็นสตริงล้วน ไม่ใช่อ็อบเจ็กต์
 * ไม่งั้นมันจะไม่เท่ากับของเดิมทุกครั้งแล้ววนไม่จบ
 */
export function useFacetFilter<T extends FacetRow>(rows: T[], facets: FacetGroup[]) {
  const params = useSearchParamsFromUrl();
  const search = useSearchString();

  const shown = useMemo(() => {
    const p = new URLSearchParams(search);
    const q = (p.get(QUERY_KEY) ?? "").trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.haystack.includes(q)) return false;
      // ตัวกรองทุกอันต่อกันด้วย AND — เลือกหลายอันแล้วต้องแคบลง ไม่ใช่กว้างขึ้น
      for (const f of facets) {
        const value = p.get(f.param);
        if (value && !(r.facets[f.key] ?? []).includes(value)) return false;
      }
      return true;
    });
  }, [rows, facets, search]);

  return {
    shown,
    query: params.get(QUERY_KEY) ?? "",
    activeCount: facets.filter((f) => (params.get(f.param) ?? "") !== "").length,
  };
}

/**
 * ช่องค้นหา + ดรอปดาวน์ + ปุ่มล้าง
 *
 * ดรอปดาวน์ทุกอันหน้าตาเดียวกัน ทั้งอันที่มีหลายค่าและอันที่เป็น yes/no
 * อันหลังเป็นดรอปดาวน์ไม่ใช่เช็กบ็อกซ์ เพราะเช็กบ็อกซ์บอกได้แค่ "เอา" กับ "ไม่สน"
 * แต่ "เอาเฉพาะตัวที่ใส่ลิงก์เชนไม่ได้" ก็เป็นคำถามจริง
 */
export function FacetFilters({
  idPrefix,
  facets,
  labels,
  query,
  activeCount,
  shownCount,
}: {
  /** กันไม่ให้ id ของ label/select ชนกันถ้าวันหนึ่งมีสองชุดในหน้าเดียว */
  idPrefix: string;
  facets: FacetGroup[];
  labels: FacetLabels;
  query: string;
  activeCount: number;
  shownCount: number;
}) {
  // อ่าน URL ที่นี่เอง ไม่รับมาเป็น prop — ค่าที่เลือกอยู่ต้องมาจากแหล่งเดียวกับที่กรอง
  const params = useSearchParamsFromUrl();

  return (
    <div className="mt-5">
      <label htmlFor={`${idPrefix}-search`} className="sr-only">
        {labels.search}
      </label>
      <input
        id={`${idPrefix}-search`}
        type="search"
        value={query}
        onChange={(e) => writeParam(QUERY_KEY, e.target.value)}
        placeholder={labels.search}
        autoComplete="off"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:max-w-sm"
      />

      <fieldset className="mt-4">
        <legend className="sr-only">{labels.filters}</legend>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
          {facets.map((facet) => {
            const value = params.get(facet.param) ?? "";
            return (
              <FacetSelect
                key={facet.param}
                idPrefix={idPrefix}
                facet={facet}
                value={value}
                anyLabel={labels.any}
              />
            );
          })}
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => clearParams(facets.map((f) => f.param))}
            className="mt-3 rounded-lg px-1 py-1 text-xs text-muted underline underline-offset-2 hover:text-ink"
          >
            {labels.clear} ({activeCount})
          </button>
        )}
      </fieldset>

      {(query.trim() !== "" || activeCount > 0) && (
        <p className="mt-3 text-sm text-muted" role="status">
          {shownCount} {labels.matches}
        </p>
      )}
    </div>
  );
}

function FacetSelect({
  idPrefix,
  facet,
  value,
  anyLabel,
}: {
  idPrefix: string;
  facet: FacetGroup;
  value: string;
  anyLabel: string;
}) {
  const id = `${idPrefix}-facet-${facet.param}`;
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {facet.legend}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => writeParam(facet.param, e.target.value)}
        className={`w-full min-w-0 rounded-lg border bg-surface px-2 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          value ? "border-gold text-ink" : "border-line text-ink-2"
        }`}
      >
        <option value="">{anyLabel}</option>
        {facet.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
    </span>
  );
}
