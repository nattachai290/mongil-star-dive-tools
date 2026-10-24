"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * แท็บขั้นปลุกพลังของบิ้ว — เนื้อหาทุกแท็บถูก render ฝั่งเซิร์ฟเวอร์มาแล้ว
 * ตัวนี้แค่สลับว่าโชว์แท็บไหน หน้าเว็บจึงยังเป็น static export ได้
 */
export function BuildTabs({ labels, panels }: { labels: string[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const base = useId();

  return (
    <div>
      {labels.length > 1 && (
        <div role="tablist" className="flex flex-wrap gap-1.5">
          {labels.map((label, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              id={`${base}-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`${base}-panel-${i}`}
              onClick={() => setActive(i)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                i === active
                  ? "border-gold bg-gold-bg text-ink"
                  : "border-line text-ink-2 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {panels.map((panel, i) => (
        <div
          key={i}
          role={labels.length > 1 ? "tabpanel" : undefined}
          id={`${base}-panel-${i}`}
          aria-labelledby={labels.length > 1 ? `${base}-tab-${i}` : undefined}
          hidden={i !== active}
          className="mt-4"
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
