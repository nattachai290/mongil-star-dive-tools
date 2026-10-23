# Deploy และ CI

## GitHub Actions

ไฟล์ `.github/workflows/ci.yml` มี 2 job ที่รันคู่ขนานกัน

| Job | ทำอะไร | fail เมื่อ |
|---|---|---|
| `check` | typecheck → lint → ตรวจไฟล์ข้อมูล → build | typecheck/lint พัง, ข้อมูลผิด schema, build ไม่ผ่าน |
| `audit` | `npm audit --omit=dev --audit-level=high` | แพ็กเกจที่ไปกับเว็บจริงมีช่องโหว่ระดับ **high** หรือ **critical** |

รันเมื่อ:

- push เข้า `main`
- ทุก pull request
- **ทุกเช้าวันจันทร์ 09:00 เวลาไทย** (`cron: "0 2 * * 1"` — GitHub Actions ใช้ UTC)
  เพื่อให้เจอช่องโหว่ที่เพิ่งถูกประกาศ แม้ไม่มีใคร push อะไรเลยทั้งสัปดาห์
- กดรันเองได้จากแท็บ Actions (`workflow_dispatch`)

### ทำไมถึงตั้งที่ระดับ high

ระดับ `low` กับ `moderate` ของ dependency ฝั่ง dev มักเป็นช่องโหว่ที่ไม่มีผลกับเว็บ static
ถ้าตั้งให้ fail ทุกระดับ CI จะแดงค้างจนคนเลิกสนใจ — ซึ่งอันตรายกว่าไม่ตั้งเลย

ช่องโหว่ **ทุกระดับ** ยังถูกรายงานอยู่ดีใน **job summary** ของแต่ละรัน (แท็บ Actions → เลือกรัน)
ถ้าอยากเข้มขึ้นภายหลัง เปลี่ยน `--audit-level=high` เป็น `moderate` ใน workflow

### ทำไมไม่นับ devDependencies

ตั้งแต่ 2026-10 ตัวที่ทำให้ job แดงดูเฉพาะ `dependencies` (`--omit=dev`)
เว็บนี้ build เป็น static แพ็กเกจฝั่ง dev (eslint, typescript, sharp ที่ใช้ตัดรูป) ไม่ได้ไปถึงผู้ใช้

ที่มา: `braces` ซึ่งมาทาง eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch
มีช่องโหว่ high ทุกเวอร์ชันและยังไม่มีตัวแก้ `npm audit fix --force` เสนอให้ลด eslint-config-next ไปเวอร์ชัน 14
ซึ่งใช้กับ Next 16 ไม่ได้ ถ้าเกณฑ์ยังนับ dev ด้วย CI จะแดงค้างจนกว่า upstream จะแก้ — แบบที่ย่อหน้าบนเตือนไว้

ช่องโหว่ฝั่ง dev **ยังถูกรายงานทุกครั้ง** ใน job summary (`npm audit` แบบเต็ม) ดูเป็นระยะ
และพอ braces มีเวอร์ชันแก้ ให้รัน `npm audit fix` ตามปกติ

ตรวจในเครื่องด้วยคำสั่งเดียวกัน:

```bash
npm run audit          # เท่ากับที่ CI รัน (เฉพาะแพ็กเกจที่ไปกับเว็บ)
npm audit              # ดูทุกระดับ รวม dev
npm audit fix          # แก้อัตโนมัติเท่าที่ทำได้
```

## GitHub Pages

เว็บ build เป็นไฟล์ static ล้วน (`output: "export"` ใน `next.config.ts`) ลงโฟลเดอร์ `out/`
แล้ว `.github/workflows/pages.yml` อัปขึ้น GitHub Pages ทุกครั้งที่ push เข้า `main`

ที่อยู่เว็บ: **https://nattachai290.github.io/mongil-star-dive-tools/**

ย้ายมาจาก Vercel เมื่อ 2026-10-23 ตามที่เจ้าของ repo สั่ง (`vercel.json` ลบทิ้งแล้ว)

### เปิดใช้ครั้งแรก (ทำครั้งเดียว บนหน้าเว็บ GitHub)

1. repo → **Settings → Pages**
2. **Build and deployment → Source** เลือก **GitHub Actions**
3. ไปแท็บ **Actions** → **Deploy to GitHub Pages** → **Run workflow** (หรือ push อะไรก็ได้เข้า `main`)

repo ส่วนตัว (private) เปิด Pages ได้เฉพาะบัญชี GitHub Pro ขึ้นไป — บัญชีฟรีต้องเป็น repo สาธารณะ

### พาธนำหน้า (basePath)

เว็บอยู่ใต้ `/mongil-star-dive-tools/` ไม่ใช่รากโดเมน workflow ส่ง `NEXT_PUBLIC_BASE_PATH` ให้ตอน build

- `<Link>` และ `router.push` เติมพาธนำหน้าให้เอง
- **src ของรูปไม่เติมให้** ต้องผ่าน `asset()` ใน `src/lib/base-path.ts` ทุกครั้ง
  ลืมแล้วรูปจะขึ้นใน dev (ไม่มีพาธนำหน้า) แต่พังบนเว็บจริง
- ถ้าวันหนึ่งใช้โดเมนของตัวเอง ให้ลบ `NEXT_PUBLIC_BASE_PATH` ออกจาก workflow และแก้ `NEXT_PUBLIC_SITE_URL`

### สิ่งที่ไม่มีบน GitHub Pages

- **redirect ฝั่งเซิร์ฟเวอร์** — หน้า `/` จึงพาไป `/th/` ด้วย meta refresh (`src/app/page.tsx`)
- **การแปลงรูปตอนเปิดหน้า** — `images.unoptimized` เปิดไว้ รูปทุกรูปย่อเป็น webp มาแล้วตอนเตรียม
- **preview URL ต่อ PR** — เห็นผลบนเว็บจริงหลัง merge เข้า `main` เท่านั้น
  ดูก่อน merge ได้ในเครื่อง: `npm run build && npm run preview` แล้วเปิด http://localhost:3000

### deploy เฉพาะตอนข้อมูลถูก

workflow รัน `validate:data` ก่อน build — ข้อมูลผิด schema จะไม่ขึ้นเว็บ
ถ้าอยากให้ต้องผ่าน CI ทั้งหมดก่อน ให้เปิด branch protection บน `main` ให้ต้องผ่าน job `check` ก่อน merge
