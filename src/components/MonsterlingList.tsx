"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n";
import { clearParams, useSearchParamsFromUrl, useSearchString, writeParam } from "./url-state";

const QUERY_KEY = "q";

/** ค่าที่ใช้กรอง คิดมาจากฝั่งเซิร์ฟเวอร์แล้ว ที่นี่เทียบสตริงล้วน */
export type RowFacets = {
  stat: string[];
  damageType: string[];
  target: string[];
  enemy: string[];
  always: string[];
  link: string[];
  data: string[];
};

export type FacetGroup = {
  key: keyof RowFacets;
  /** ชื่อพารามิเตอร์ใน URL — สั้นกว่า key เพื่อให้ลิงก์ที่ก็อปไปอ่านง่าย */
  param: string;
  legend: string;
  options: { value: string; label: string; count: number }[];
};

export type MonsterlingRow = {
  key: string;
  facets: RowFacets;
  book: string;
  bookLabel: string;
  no: number;
  name: string;
  /** true = กำลังแสดงอีกภาษาแทน เพราะยังไม่มีภาษาที่ขอ */
  nameIsFallback: boolean;
  image: string | null;
  badge: string | null;
  effects: { headline: string; qualifiers: string[] }[];
  /** ทุกอย่างที่ค้นหาได้ รวมชื่ออีกภาษาและข้อความเอฟเฟกต์ */
  haystack: string;
};

/**
 * รายการมอนพร้อมช่องค้นหาและตัวกรอง
 *
 * ประโยคเอฟเฟกต์และค่าที่ใช้กรองถูกคิดมาจากฝั่งเซิร์ฟเวอร์แล้ว ที่นี่รับมาเป็นสตริงล้วน
 * จะได้ไม่ต้องส่งพจนานุกรมทั้งก้อนไปให้เบราว์เซอร์เพียงเพื่อค้นหา
 */
export function MonsterlingList({
  rows,
  locale,
  facets,
  labels,
}: {
  rows: MonsterlingRow[];
  locale: Locale;
  facets: FacetGroup[];
  labels: {
    search: string;
    matches: string;
    noMatch: string;
    noEffect: string;
    untranslated: string;
    untranslatedTitle: string;
    filters: string;
    any: string;
    clear: string;
  };
}) {
  // URL คือแหล่งความจริงเดียวของคำค้นและตัวกรอง ไม่ได้เก็บซ้ำไว้ใน state
  const params = useSearchParamsFromUrl();
  const search = useSearchString();

  const query = params.get(QUERY_KEY) ?? "";
  const activeCount = facets.filter((f) => (params.get(f.param) ?? "") !== "").length;

  const shown = useMemo(() => {
    const p = new URLSearchParams(search);
    const q = (p.get(QUERY_KEY) ?? "").trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.haystack.includes(q)) return false;
      // ตัวกรองทุกอันต่อกันด้วย AND — เลือกหลายอันแล้วต้องแคบลง ไม่ใช่กว้างขึ้น
      for (const f of facets) {
        const value = p.get(f.param);
        if (value && !r.facets[f.key].includes(value)) return false;
      }
      return true;
    });
  }, [rows, facets, search]);

  // จัดกลุ่มหลังกรอง เพื่อให้สมุดที่ไม่มีผลลัพธ์หายไปทั้งหัวข้อ ไม่เหลือหัวข้อโล่ง ๆ
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: MonsterlingRow[] }>();
    for (const row of shown) {
      const group = map.get(row.book) ?? { label: row.bookLabel, rows: [] };
      group.rows.push(row);
      map.set(row.book, group);
    }
    return [...map.values()];
  }, [shown]);

  return (
    <>
      <div className="mt-5">
        <label htmlFor="monsterling-search" className="sr-only">
          {labels.search}
        </label>
        <input
          id="monsterling-search"
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
                <span key={facet.param} className="flex min-w-0 flex-col gap-1">
                  <label
                    htmlFor={`facet-${facet.param}`}
                    className="text-[11px] font-medium uppercase tracking-wide text-muted"
                  >
                    {facet.legend}
                  </label>
                  <select
                    id={`facet-${facet.param}`}
                    value={value}
                    onChange={(e) => writeParam(facet.param, e.target.value)}
                    className={`w-full min-w-0 rounded-lg border bg-surface px-2 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                      value ? "border-gold text-ink" : "border-line text-ink-2"
                    }`}
                  >
                    <option value="">{labels.any}</option>
                    {facet.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label} ({o.count})
                      </option>
                    ))}
                  </select>
                </span>
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
            {shown.length} {labels.matches}
          </p>
        )}
      </div>

      {groups.length === 0 && <p className="mt-8 text-sm text-muted">{labels.noMatch}</p>}

      {groups.map((group) => (
        <section key={group.label} className="mt-8">
          <h2 className="font-display text-sm font-semibold text-ink-2">
            {group.label}{" "}
            <span className="font-mono text-xs font-normal text-muted">{group.rows.length}</span>
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {group.rows.map((row) => (
              <li
                key={row.key}
                className="flex gap-3 rounded-lg border border-line bg-surface p-3"
              >
                {row.image ? (
                  <Image
                    src={row.image}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 shrink-0 rounded bg-surface-2 object-contain"
                  />
                ) : (
                  <div className="size-14 shrink-0 rounded bg-surface-2" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-xs text-muted">No.{row.no}</span>
                    {row.badge && (
                      <span className="rounded bg-gold-bg px-1.5 py-0.5 text-[11px] text-gold">
                        {row.badge}
                      </span>
                    )}
                  </div>

                  <p className="font-display text-sm font-semibold">
                    <span lang={row.nameIsFallback ? (locale === "th" ? "en" : "th-TH") : undefined}>
                      {row.name}
                    </span>
                    {row.nameIsFallback && (
                      <span
                        className="ms-1.5 rounded bg-surface-2 px-1.5 py-0.5 align-middle font-mono text-[10px] text-muted"
                        title={labels.untranslatedTitle}
                      >
                        {labels.untranslated}
                      </span>
                    )}
                  </p>

                  {row.effects.length > 0 ? (
                    <div className="mt-2 space-y-2 border-t border-line pt-2">
                      {row.effects.map((effect, i) => (
                        <div key={i} className="space-y-1.5">
                          <p className="text-sm leading-relaxed text-ink">{effect.headline}</p>
                          {effect.qualifiers.length > 0 && (
                            <ul className="flex flex-wrap gap-1">
                              {effect.qualifiers.map((q) => (
                                <li
                                  key={q}
                                  className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] leading-tight text-ink-2"
                                >
                                  {q}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted">{labels.noEffect}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
