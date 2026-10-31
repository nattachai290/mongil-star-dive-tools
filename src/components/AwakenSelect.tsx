"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * ขั้นปลุกพลังแยกรายตัวในทีม (ผู้เล่นสั่ง 2026-10-31 "dropdown ปลุกพลังต้องแยกกันของแต่ละตัวในทีม")
 *
 * ทุกชุดค่าผสมถูก render ฝั่งเซิร์ฟเวอร์มาแล้ว ตัวนี้แค่เก็บว่าแต่ละตัวเลือกขั้นไหน แล้วสลับว่าโชว์ชุดไหน
 * หน้าเว็บจึงยังเป็น static export ได้ · ตัวเลือกรวมขั้นที่ให้ผลเหมือนกันไว้แล้ว (เช่น 0–2) ชุดค่าผสมจึงไม่เยอะ
 */
type Ctx = {
  stages: number[];
  set: (member: number, stage: number) => void;
  /** ตัวละครที่กำลังดูของอยู่ (หน้าบิ้วโชว์ทีละตัว) */
  selected: number;
  select: (member: number) => void;
};
const AwakenContext = createContext<Ctx | null>(null);

/** คีย์ของชุดค่าผสม — ขั้นต่ำสุดของช่วงที่แต่ละตัวเลือก คั่นด้วยจุลภาค */
export const awakenKey = (stages: number[]) => stages.join(",");

export function AwakenProvider({ initial, children }: { initial: number[]; children: ReactNode }) {
  const [stages, setStages] = useState(initial);
  const [selected, select] = useState(0);
  const set = (member: number, stage: number) => setStages((s) => s.map((x, i) => (i === member ? stage : x)));
  return <AwakenContext.Provider value={{ stages, set, selected, select }}>{children}</AwakenContext.Provider>;
}

/**
 * ปุ่มขั้นปลุกพลังของตัวที่ member — options คือ [ค่า (ขั้นต่ำสุดของช่วง), ข้อความ]
 * กดแล้วเลือกตัวนั้นให้ด้วย จะได้เห็นของที่เปลี่ยนทันที (หน้าบิ้วแบบใหม่ 2026-10-31)
 */
export function AwakenPills({
  member,
  label,
  options,
  className = "",
}: {
  member: number;
  label: string;
  options: [number, string][];
  className?: string;
}) {
  const ctx = useContext(AwakenContext);
  if (!ctx) return null;
  return (
    <div role="group" aria-label={label} className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs text-ink-2">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map(([value, text]) => {
          const on = ctx.stages[member] === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => {
                ctx.set(member, value);
                ctx.select(member);
              }}
              className={`min-h-9 min-w-10 rounded-lg px-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail ${
                on ? "bg-ink font-semibold text-bg" : "bg-surface-2 text-ink-2 hover:text-ink"
              }`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** การ์ดตัวละครในทีม — กดเพื่อดูของของตัวนั้น · children = รูป ชื่อ ธาตุ (render ฝั่งเซิร์ฟเวอร์) */
export function MemberTab({ member, children, footer }: { member: number; children: ReactNode; footer?: ReactNode }) {
  const ctx = useContext(AwakenContext);
  const on = ctx?.selected === member;
  return (
    <div
      className={`flex min-w-0 flex-col gap-3 rounded-2xl border-2 bg-surface p-3 sm:p-4 ${
        on ? "border-rail shadow-[0_6px_20px_rgba(90,99,216,0.15)]" : "border-line"
      }`}
    >
      <button
        type="button"
        aria-pressed={on}
        onClick={() => ctx?.select(member)}
        className="flex min-w-0 flex-col items-center gap-2 rounded-lg text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail sm:flex-row sm:items-center sm:text-start"
      >
        {children}
      </button>
      {footer}
    </div>
  );
}

/** ของของตัวที่ member — โชว์เฉพาะตัวที่เลือก */
export function MemberPanel({ member, children }: { member: number; children: ReactNode }) {
  const ctx = useContext(AwakenContext);
  return <div hidden={(ctx?.selected ?? 0) !== member}>{children}</div>;
}

/** โชว์ panel ของชุดค่าผสมที่เลือกอยู่ — pick: คีย์ชุดค่าผสม → คีย์ panel (หลายชุดใช้ panel เดียวกันได้) */
export function AwakenSwitch({ panels, pick }: { panels: Record<string, ReactNode>; pick: Record<string, string> }) {
  const ctx = useContext(AwakenContext);
  const active = ctx ? pick[awakenKey(ctx.stages)] : undefined;
  return (
    <>
      {Object.entries(panels).map(([key, panel]) => (
        <div key={key} hidden={key !== active}>
          {panel}
        </div>
      ))}
    </>
  );
}

/** โชว์ลูกเฉพาะเมื่อชุดค่าผสมที่เลือกอยู่ใน combos — ใช้กับของที่ render ครั้งเดียวแต่ไม่ได้มีทุกชุด (เช่น บัฟจากปลุกพลัง) */
export function AwakenOnly({ combos, children }: { combos: string[]; children: ReactNode }) {
  const ctx = useContext(AwakenContext);
  const on = ctx ? combos.includes(awakenKey(ctx.stages)) : false;
  return <div hidden={!on}>{children}</div>;
}

/** ข้อความสั้นที่เปลี่ยนตามชุดค่าผสม */
export function AwakenText({ values }: { values: Record<string, string> }) {
  const ctx = useContext(AwakenContext);
  return <>{ctx ? values[awakenKey(ctx.stages)] : ""}</>;
}

export type StatRow = { label: string; fmt: "num" | "pct" | "sec" };

/**
 * ตารางค่าพลังรวม — ส่งมาแค่ตัวเลขของแต่ละชุดค่าผสม แล้ววาดตารางเฉพาะชุดที่เลือก
 * (ผู้เล่นถาม 2026-10-31 ว่าหน้าใหญ่ไป — เดิม render ตารางเต็มทุกชุด)
 */
export function AwakenStatsTable({
  rows,
  values,
  head,
  sec,
}: {
  rows: StatRow[];
  /** คีย์ชุดค่าผสม → [ของที่ใส่, รวมบัฟ] เรียงตาม rows */
  values: Record<string, [number[], number[]]>;
  head: [string, string];
  sec: string;
}) {
  const ctx = useContext(AwakenContext);
  const v = ctx ? values[awakenKey(ctx.stages)] : undefined;
  if (!v) return null;
  const [gear, all] = v;
  const fmt = (kind: StatRow["fmt"], n: number) =>
    kind === "num"
      ? Math.round(n).toLocaleString("en-US")
      : kind === "pct"
        ? `${Math.round(n * 100) / 100}%`
        : `${Math.round(n * 100) / 100}${sec}`;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] text-muted">
          <th className="py-1 text-start font-normal"></th>
          <th className="py-1 text-end font-normal">{head[0]}</th>
          <th className="py-1 text-end font-normal">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) =>
          gear[i] === 0 && all[i] === 0 ? null : (
            <tr key={i} className="border-t border-line">
              <td className="py-1 text-xs text-ink-2">{r.label}</td>
              <td className="py-1 text-end font-mono">{fmt(r.fmt, gear[i])}</td>
              <td className="py-1 text-end font-mono text-gold">{fmt(r.fmt, all[i])}</td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
