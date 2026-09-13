# Deploy และ CI

## GitHub Actions

ไฟล์ `.github/workflows/ci.yml` มี 2 job ที่รันคู่ขนานกัน

| Job | ทำอะไร | fail เมื่อ |
|---|---|---|
| `check` | typecheck → lint → ตรวจไฟล์ข้อมูล → build | typecheck/lint พัง, ข้อมูลผิด schema, build ไม่ผ่าน |
| `audit` | `npm audit --audit-level=high` | เจอช่องโหว่ระดับ **high** หรือ **critical** |

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

ตรวจในเครื่องด้วยคำสั่งเดียวกัน:

```bash
npm run audit          # เท่ากับที่ CI รัน
npm audit              # ดูทุกระดับ
npm audit fix          # แก้อัตโนมัติเท่าที่ทำได้
```

## Vercel

`vercel.json` ตั้ง framework เป็น `nextjs` และบังคับให้ install ด้วย `npm ci`
เพื่อให้ build บน Vercel ใช้เวอร์ชันตรงกับ `package-lock.json` เป๊ะ ๆ เหมือนใน CI

### เชื่อม repo ครั้งแรก (ทำครั้งเดียว)

1. เข้า [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. เลือก `nattachai290/mongil-star-dive-tools`
   (ถ้าไม่เห็น repo ให้กด **Adjust GitHub App Permissions** แล้วให้สิทธิ์ repo นี้)
3. Framework Preset จะขึ้น **Next.js** เอง — ไม่ต้องแก้ Build/Output/Install command
4. กด **Deploy**

หลังจากนั้น Vercel จะ deploy อัตโนมัติ:

- push เข้า `main` → **Production**
- ทุก branch และทุก PR → **Preview URL** แยกของตัวเอง (รีวิวข้อมูลจากหน้าเว็บจริงได้ก่อน merge)

### ถ้าอยากให้ deploy เฉพาะตอน CI ผ่าน

ตั้งใน Vercel: **Settings → Git → Ignored Build Step** แล้วใส่คำสั่งที่ exit 0 เมื่อควรข้าม build
หรือใช้วิธีตรงกว่าคือเปิด branch protection บน `main` ให้ต้องผ่าน CI ก่อน merge
งาน production จึงไม่มีวันได้โค้ดที่ CI ไม่ผ่าน
