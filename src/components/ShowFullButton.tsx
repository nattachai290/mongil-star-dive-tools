"use client";

import { writeParam } from "./url-state";

/**
 * ป้ายบอกว่าคำอธิบายยังมีต่ออีกกี่บรรทัด และกดแล้วไปมุมมองเต็มเลย
 *
 * เป็นปุ่มไม่ใช่ป้ายเฉย ๆ เพราะป้ายที่บอกว่า "ยังมีอีก 4 บรรทัด"
 * แล้วไม่บอกว่าไปดูที่ไหน คือการทำให้คนอ่านค้างอยู่ตรงนั้น
 */
export function ShowFullButton({ count, label }: { count: number; label: string }) {
  return (
    <button
      type="button"
      onClick={() => writeParam("view", "full")}
      className="ms-1.5 rounded border border-line bg-surface-2 px-1.5 py-0.5 align-middle text-[11px] whitespace-nowrap text-muted transition-colors hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      +{count} {label}
    </button>
  );
}
