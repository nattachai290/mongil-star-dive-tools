/**
 * พิมพ์เอฟเฟกต์ทุกตัวเป็นประโยคสองภาษา — ใช้ตรวจด้วยตาว่าโครงข้อมูลประกอบกลับเป็นคำพูดได้จริง
 * ไม่ใช่เทสต์อัตโนมัติ แต่เป็นเครื่องมือให้คนอ่านก่อนเชื่อหน้าเว็บ
 */
import { MONSTERLINGS } from "../src/lib/data";
import { describeEffect } from "../src/lib/describe";

for (const m of [...MONSTERLINGS.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`\n── ${m.name.th ?? m.id} / ${m.name.en ?? ""}`);
  for (const e of m.speciesEffects) {
    for (const loc of ["th", "en"] as const) {
      const d = describeEffect(e, loc);
      const q = d.qualifiers.length ? `  [${d.qualifiers.join(" · ")}]` : "";
      console.log(`   ${loc}  ${d.headline}${q}`);
    }
  }
}
