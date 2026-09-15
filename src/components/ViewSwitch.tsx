"use client";

import type { ReactNode } from "react";
import { useSearchParamsFromUrl, writeParam } from "./url-state";

const VIEW_KEY = "view";

/**
 * สลับระหว่างมุมมองย่อกับมุมมองเต็มของบล็อกเดียวกัน
 *
 * ทั้งสองมุมมองถูกเรนเดอร์มาจากฝั่งเซิร์ฟเวอร์แล้วส่งมาเป็น children
 * คอมโพเนนต์นี้จึงไม่รู้จักข้อมูลเกมเลย รู้แค่ว่าตอนนี้ควรโชว์อันไหน
 * (และหน้าที่ปิด JS ก็ยังได้มุมมองเริ่มต้นที่ถูกต้องเพราะเป็น SSG)
 */
export function ViewSwitch({
  summary,
  full,
  labels,
}: {
  summary: ReactNode;
  full: ReactNode;
  labels: { legend: string; summary: string; full: string };
}) {
  const params = useSearchParamsFromUrl();
  const isFull = params.get(VIEW_KEY) === "full";

  const buttons: [boolean, string, string][] = [
    [false, "", labels.summary],
    [true, "full", labels.full],
  ];

  return (
    <>
      <div
        className="mt-3 inline-flex rounded-lg border border-line bg-surface p-0.5"
        role="group"
        aria-label={labels.legend}
      >
        {buttons.map(([wantsFull, value, text]) => (
          <button
            key={text}
            type="button"
            aria-pressed={isFull === wantsFull}
            onClick={() => writeParam(VIEW_KEY, value)}
            className={`rounded-md px-3 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
              isFull === wantsFull ? "bg-gold-bg text-gold" : "text-ink-2 hover:text-ink"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="mt-3">{isFull ? full : summary}</div>
    </>
  );
}
