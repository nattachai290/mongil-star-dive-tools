"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * เก็บสถานะของหน้า (คำค้น ตัวกรอง มุมมอง) ไว้ใน URL ไม่ใช่ใน state อย่างเดียว
 *
 * เพราะสลับภาษาคือการเปลี่ยนหน้า (/th/... -> /en/...) คอมโพเนนต์จะถูกสร้างใหม่
 * state ที่ตั้งไว้จึงหายหมด ถ้าอยู่ใน URL มันจะข้ามหน้าไปด้วยได้
 * และก็อปลิงก์ส่งให้คนอื่นแล้วเห็นเหมือนกันด้วย
 *
 * ทะเบียนผู้ฟังมีชุดเดียวทั้งเว็บ ทุกคอมโพเนนต์ที่อ่าน URL จึงตื่นพร้อมกัน
 */
const listeners = new Set<() => void>();

/** replaceState ไม่ยิง popstate จึงต้องบอกคนที่ subscribe เอง */
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

/**
 * snapshot เป็น "สตริง search ทั้งก้อน" ไม่ใช่อ็อบเจกต์ที่แกะแล้ว
 * useSyncExternalStore เทียบ snapshot ด้วย Object.is ถ้าคืนอ็อบเจกต์ใหม่ทุกครั้งจะวนไม่จบ
 */
function readSearch(): string {
  return window.location.search;
}

function commit(params: URLSearchParams) {
  const search = params.toString();
  // replaceState ไม่ใช่ push เพราะทุกตัวอักษรที่พิมพ์ไม่ควรกลายเป็นประวัติย้อนกลับหนึ่งขั้น
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
  for (const onChange of listeners) onChange();
}

export function writeParam(key: string, value: string) {
  const params = new URLSearchParams(window.location.search);
  if (value.trim() === "") params.delete(key);
  else params.set(key, value);
  commit(params);
}

export function clearParams(keys: string[]) {
  const params = new URLSearchParams(window.location.search);
  for (const key of keys) params.delete(key);
  commit(params);
}

/**
 * ฝั่งเซิร์ฟเวอร์คืนค่าว่างเสมอ React จึงเรนเดอร์ใหม่ให้เองหลัง hydrate
 * โดยไม่ฟ้อง mismatch — และหน้าที่ปิด JS ก็ยังได้ค่าเริ่มต้นที่ถูกต้อง
 */
export function useSearchParamsFromUrl(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, readSearch, () => "");
  return useMemo(() => new URLSearchParams(search), [search]);
}

/** ใช้ตอนต้องการสตริงดิบไปใส่เป็น dependency ของ useMemo ที่กรองข้อมูลก้อนใหญ่ */
export function useSearchString(): string {
  return useSyncExternalStore(subscribe, readSearch, () => "");
}
