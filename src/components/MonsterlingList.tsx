"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * รายการมอนพร้อมช่องค้นหา
 *
 * ประโยคเอฟเฟกต์ถูกแปลงเป็นข้อความมาจากฝั่งเซิร์ฟเวอร์แล้ว ที่นี่รับมาเป็นสตริงล้วน
 * จะได้ไม่ต้องส่งพจนานุกรมทั้งก้อนไปให้เบราว์เซอร์เพียงเพื่อค้นหา
 */
export type MonsterlingRow = {
  key: string;
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

export function MonsterlingList({
  rows,
  locale,
  labels,
}: {
  rows: MonsterlingRow[];
  locale: Locale;
  labels: {
    search: string;
    matches: string;
    noMatch: string;
    noEffect: string;
    untranslated: string;
    untranslatedTitle: string;
  };
}) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.haystack.includes(q));
  }, [rows, query]);

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
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.search}
          autoComplete="off"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:max-w-sm"
        />
        {query.trim() !== "" && (
          <p className="mt-2 text-sm text-muted" role="status">
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
