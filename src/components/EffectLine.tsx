import type { Effect } from "@/lib/schema/common";
import type { Locale } from "@/lib/i18n";
import { describeEffect } from "@/lib/describe";

/**
 * เอฟเฟกต์หนึ่งข้อ = ประโยคหลัก + ชิปเงื่อนไข
 *
 * แยกเงื่อนไขออกมาเป็นชิปแทนที่จะยัดลงประโยค เพราะบางตัวมีเงื่อนไขซ้อนสี่ชั้น
 * (ทีม + บอส + ธาตุ + คูลดาวน์) ถ้าเขียนติดกันหมดจะอ่านไม่ออก
 */
export function EffectLine({ effect, locale }: { effect: Effect; locale: Locale }) {
  const { headline, qualifiers } = describeEffect(effect, locale);

  return (
    <div className="space-y-1.5">
      <p className="text-sm leading-relaxed text-ink">{headline}</p>
      {qualifiers.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {qualifiers.map((q) => (
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
  );
}
