"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * เลือกขั้นปลุกพลังของบิ้ว (dropdown) — เนื้อหาทุกขั้นถูก render ฝั่งเซิร์ฟเวอร์มาแล้ว
 * ตัวนี้แค่สลับว่าโชว์ขั้นไหน หน้าเว็บจึงยังเป็น static export ได้ (ผู้เล่นสั่ง 2026-10-31)
 */
export function AwakenSelect({
  label,
  options,
  panels,
  initial = 0,
}: {
  label: string;
  options: string[];
  panels: ReactNode[];
  initial?: number;
}) {
  const [active, setActive] = useState(initial);
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
        {label}
        <select
          id={id}
          value={active}
          onChange={(e) => setActive(Number(e.target.value))}
          className="rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {options.map((o, i) => (
            <option key={i} value={i}>
              {o}
            </option>
          ))}
        </select>
      </label>
      {panels.map((panel, i) => (
        <div key={i} hidden={i !== active} className="mt-4">
          {panel}
        </div>
      ))}
    </div>
  );
}
