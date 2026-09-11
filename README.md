# mongil-star-dive-tools

เว็บรวมข้อมูลเกม **MONGIL: STAR DIVE** — ตัวละคร (พร้อมสกิลและ Awaken), Artifact, Monsterling,
อาหาร และ Build guide

- 📋 แผนพัฒนา: [`docs/PLAN.md`](docs/PLAN.md)
- 🚀 Deploy และ CI: [`docs/DEPLOY.md`](docs/DEPLOY.md)
- 🤖 หลังบ้านที่ AI อ่านได้: [`docs/DATA-FOR-AI.md`](docs/DATA-FOR-AI.md)

## เริ่มพัฒนา

```bash
npm ci
npm run dev          # http://localhost:3000
```

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รัน dev server |
| `npm run build` | build สำหรับ production |
| `npm run check` | typecheck + lint + selftest + ตรวจไฟล์ข้อมูล (รันก่อน push) |
| `npm run selftest` | ทดสอบ schema และสูตรดาเมจด้วยข้อมูลจำลอง |
| `npm run validate:data` | ตรวจไฟล์ JSON ใน `data/` |
| `npm run audit` | ตรวจช่องโหว่ dependency ระดับ high ขึ้นไป |

## โครงสร้าง

```
data/          ข้อมูลเกมทั้งหมด — หนึ่งรายการ = หนึ่งไฟล์ .json
public/images/ รูปที่ผ่านสคริปต์ crop/resize แล้ว
assets-src/    แคปหน้าจอดิบ (ไม่ commit)
scripts/       สคริปต์ตรวจข้อมูลและประมวลผลรูป
src/           โค้ดเว็บ (Next.js App Router)
```

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · zod

---

> เว็บนี้เป็น fan site ไม่ใช่เว็บทางการ เครื่องหมายการค้า รูปภาพ และเนื้อหาในเกมทั้งหมด
> เป็นลิขสิทธิ์ของผู้พัฒนาและผู้จัดจำหน่ายเกม
