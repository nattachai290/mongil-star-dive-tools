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
  /** ตัวแทนที่กำลังเปิดดูของ (id ของปุ่มตัวแทน) — null = ไม่ได้เปิด */
  sub: string | null;
  setSub: (id: string | null) => void;
};
const AwakenContext = createContext<Ctx | null>(null);

/** คีย์ของชุดค่าผสม — ขั้นต่ำสุดของช่วงที่แต่ละตัวเลือก คั่นด้วยจุลภาค */
export const awakenKey = (stages: number[]) => stages.join(",");

export function AwakenProvider({ initial, children }: { initial: number[]; children: ReactNode }) {
  const [stages, setStages] = useState(initial);
  const [selected, select] = useState(0);
  const [sub, setSub] = useState<string | null>(null);
  const set = (member: number, stage: number) => setStages((s) => s.map((x, i) => (i === member ? stage : x)));
  return <AwakenContext.Provider value={{ stages, set, selected, select, sub, setSub }}>{children}</AwakenContext.Provider>;
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

/**
 * ปุ่มตัวแทนในการ์ดตัวละคร (ผู้เล่นสั่ง 2026-11-01 ย้ายตัวแทนไปไว้ใต้ชื่อในการ์ด)
 * กดแล้วเลือกตัวที่ถูกแทน + เปิดของของตัวแทนด้านล่าง · กดซ้ำเพื่อปิด
 */
export function SubChip({ member, id, label, children }: { member: number; id: string; label: string; children: ReactNode }) {
  const ctx = useContext(AwakenContext);
  const on = ctx?.sub === id;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={() => {
        if (!ctx) return;
        ctx.select(member);
        ctx.setSub(on ? null : id);
        if (!on) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border py-0.5 ps-0.5 pe-0.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rail sm:pe-2.5 ${
        on ? "border-rail bg-surface-2" : "border-line bg-surface hover:border-rail"
      }`}
    >
      {children}
    </button>
  );
}

/** ของของตัวแทนที่เปิดอยู่ — โชว์เฉพาะตอนกดปุ่มตัวแทนนั้น */
export function SubPanel({ id, children }: { id: string; children: ReactNode }) {
  const ctx = useContext(AwakenContext);
  return (
    <div id={id} hidden={ctx?.sub !== id} className="scroll-mt-20">
      {children}
    </div>
  );
}

/** ปุ่มปิดของตัวแทน */
export function SubClose({ label }: { label: string }) {
  const ctx = useContext(AwakenContext);
  return (
    <button
      type="button"
      onClick={() => ctx?.setSub(null)}
      className="ms-auto min-h-9 rounded-lg px-3 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-rail"
    >
      {label}
    </button>
  );
}
