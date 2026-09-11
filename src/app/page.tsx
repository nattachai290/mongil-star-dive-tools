import { SECTIONS } from "@/lib/sections";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-5">
      <section className="border-b border-line py-14">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-gold">
          ฐานข้อมูลภาษาไทย · กำลังพัฒนา
        </p>
        <h1 className="mt-4 font-display text-3xl leading-tight font-bold text-balance sm:text-4xl">
          ข้อมูลตัวละคร สกิล และของสวมใส่ ครบในที่เดียว
        </h1>
        <p className="mt-4 max-w-prose text-ink-2">
          รวมข้อมูล MONGIL: STAR DIVE ภาษาไทย — ตัวละครพร้อมสกิลและ Awaken ทั้ง 6 ขั้น, Artifact,
          Monsterling, อาหาร และ Build guide ค้นหาและกรองได้ไว เปิดบนมือถือได้สบาย
        </p>
      </section>

      <section className="py-12">
        <h2 className="font-display text-lg font-semibold">หมวดข้อมูล</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <li
              key={section.slug}
              className="flex flex-col gap-2 rounded border border-line bg-surface p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-base font-semibold">{section.title}</h3>
                {!section.ready && (
                  <span className="shrink-0 rounded-full bg-gold-bg px-2.5 py-0.5 font-mono text-[11px] text-gold">
                    เร็ว ๆ นี้
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-ink-2">{section.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="pb-4">
        <h2 className="font-display text-lg font-semibold">สถานะตอนนี้</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">
          โครงเว็บและระบบ deploy พร้อมแล้ว ขั้นถัดไปคือวางโครงสร้างข้อมูลและเครื่องมือตรวจความถูกต้อง
          ก่อนเริ่มลงข้อมูลตัวละครจริง — รายละเอียดทั้งหมดอยู่ในไฟล์{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">docs/PLAN.md</code>{" "}
          ของ repository
        </p>
      </section>
    </div>
  );
}
