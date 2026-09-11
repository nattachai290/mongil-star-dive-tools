# แผนพัฒนาเว็บฐานข้อมูล MONGIL: STAR DIVE (ภาษาไทย)

> เอกสารนี้คือแผนตั้งต้นของ repo `mongil-star-dive-tools` — เว็บรวมข้อมูลตัวละคร, Artifact,
> Monsterling, อาหาร และ Build guide สำหรับเกม MONGIL: STAR DIVE

## 1. เป้าหมาย

เว็บ static ที่โหลดเร็ว ค้นหา/กรองข้อมูลได้ไว เปิดบนมือถือสวย และ **แก้ข้อมูลได้โดยไม่ต้องแตะโค้ด**
(แก้ไฟล์ JSON ไฟล์เดียวต่อ 1 รายการ แล้ว push → เว็บอัปเดตอัตโนมัติ)

กลุ่มผู้ใช้หลัก: ผู้เล่นไทยที่อยากรู้ว่า "ตัวนี้ Awaken ถึงขั้นไหนคุ้ม", "ควรใส่ Artifact อะไร",
"Monsterling ตัวไหนเข้ากับสายนี้", "ก่อนตีบอสควรกินอะไร"

### ขอบเขตที่ตกลงแล้ว

| หัวข้อ | ที่เลือก |
|---|---|
| Stack | Next.js (App Router) + TypeScript + Tailwind CSS |
| ภาษา | ไทย + อังกฤษ (i18n ตั้งแต่แรก, ไทยเป็น default) |
| ที่มาข้อมูล | กรอกเอง + แคปหน้าจอจากเกม |
| Hosting | Vercel (หรือ GitHub Pages ถ้าอยากฟรี 100% — รองรับทั้งคู่ด้วย static export) |

---

## 2. ระบบในเกมที่ต้องสะท้อนในข้อมูล

สรุปจากการสำรวจข้อมูลเกม (ต้องยืนยันตัวเลขจริงในเกมอีกที ก่อนเผยแพร่):

- **Awaken** — ทำได้สูงสุด 6 ขั้น (ได้จากการปั้มตัวซ้ำ) ขั้นที่ **3** และ **5** ให้ +2 เลเวลสกิล
  ทำให้สกิลทะลุเพดานปกติ 12 ไปถึง **16** ได้
- **Skill** — มี 4 ประเภท: Basic Attack, Switch Skill, Special Skill, Ultimate Skill
  อัปได้ถึง 12 ต่อสกิล (ทะลุถึง 16 ด้วยโบนัส Awaken ข้างบน)
- **Breakthrough** — ปลดล็อกช่อง Monsterling เพิ่มที่ BT ขั้น **2** และ **4** (เริ่มต้น 1 ช่อง → สูงสุด 3 ช่อง)
- **Artifact** — เป็นอาวุธ มีค่าสเตตัสตายตัว + เอฟเฟกต์ประจำชิ้น
- **Monsterling** — ได้จากการ Capture มอนสเตอร์ หรือ Combine ให้สเตตัสพื้นฐาน + ความสามารถ
  ตามสายพันธุ์ (breed) และ Trait
- **Cooking** — ปลดล็อกจากเควสรอง "Healthy Meals" ใน Episode 1 แบ่งเป็น **Entree** กับ **Side**
  ใส่พร้อมกันได้ทั้งสองอย่าง บัฟอยู่ราว 30 นาที มีโอกาสออกเวอร์ชัน **Exquisite** ที่ค่าสูงกว่า
  วัตถุดิบบางช่องสลับได้ (มีไอคอนเปลี่ยนมุมขวาบน) สูตรบางส่วนซื้อจาก Brownie ที่ Hananis

> ⚠️ ทุกตัวเลขในเว็บต้องมีฟิลด์ `verifiedAt` (เวอร์ชันเกม + วันที่ยืนยัน) เพราะเกมแนวนี้ปรับบาลานซ์บ่อย

---

## 3. โครงสร้าง repo

```
mongil-star-dive-tools/
├─ data/                          ← "ฐานข้อมูล" ทั้งหมดอยู่ตรงนี้ (แก้ไฟล์ = อัปเดตเว็บ)
│  ├─ characters/<slug>.json
│  ├─ artifacts/<slug>.json
│  ├─ monsterlings/<slug>.json
│  ├─ food/<slug>.json
│  ├─ builds/<slug>.json
│  └─ meta/ (elements.json, roles.json, rarities.json, gameVersions.json)
├─ assets-src/                    ← ไฟล์แคปหน้าจอดิบ (ไม่ commit — อยู่ใน .gitignore)
├─ public/images/                 ← รูปที่ผ่านสคริปต์ crop/resize แล้ว (commit)
│  ├─ characters/ artifacts/ monsterlings/ food/ ui/
├─ scripts/
│  ├─ process-images.ts           ← crop + resize + แปลง webp/avif ด้วย sharp
│  ├─ validate-data.ts            ← ตรวจ schema + cross-reference + รูปครบไหม
│  └─ new-entry.ts                ← สร้างไฟล์ JSON เปล่าจาก template
├─ src/
│  ├─ app/[locale]/...            ← หน้าเว็บ
│  ├─ components/                 ← การ์ด, ตาราง, ตัวกรอง, skill accordion ฯลฯ
│  ├─ lib/schema/                 ← zod schema ของทุก entity
│  ├─ lib/data.ts                 ← โหลด + index ข้อมูลตอน build
│  └─ i18n/ (th.json, en.json)
└─ docs/PLAN.md                   ← ไฟล์นี้
```

**ทำไมแยกไฟล์ละรายการ:** diff อ่านง่าย, แก้พร้อมกันหลายตัวไม่ conflict, และ copy template ใหม่ได้ไว

---

## 4. Data model

ทุก entity ใช้ `id` (slug ภาษาอังกฤษ ตัวพิมพ์เล็ก-ขีดกลาง) เป็น primary key และอ้างอิงกันด้วย id
ฟิลด์ข้อความที่ผู้ใช้เห็นเป็น `{ "th": "...", "en": "..." }` เสมอ

### 4.1 Character — `data/characters/jiwon.json`

```jsonc
{
  "id": "jiwon",
  "name": { "th": "จีวอน", "en": "Jiwon" },
  "rarity": "SSR",
  "element": "fire",              // อ้าง meta/elements.json
  "role": "dps",                  // dps | tank | support | healer
  "releaseVersion": "1.0",
  "stats": {                      // ค่าที่เลเวลสูงสุด + ระบุว่าวัดที่ breakthrough ไหน
    "atLevel": 80, "atBreakthrough": 4,
    "hp": 12345, "atk": 1234, "def": 567, "critRate": 5, "critDmg": 150
  },
  "skills": {
    "basic":    { "name": {...}, "desc": {...}, "scaling": ["120%", "...16 ค่า"], "tags": ["aoe"] },
    "switch":   { "name": {...}, "desc": {...}, "cooldown": 12, "scaling": [...] },
    "special":  { "name": {...}, "desc": {...}, "cooldown": 20, "scaling": [...] },
    "ultimate": { "name": {...}, "desc": {...}, "cost": 100, "scaling": [...] }
  },
  "awaken": [                     // 6 ขั้น เรียงจาก 1 → 6
    { "stage": 1, "name": {...}, "desc": {...}, "type": "stat" },
    { "stage": 3, "name": {...}, "desc": {...}, "type": "skillLevel", "skillLevelBonus": 2 },
    { "stage": 5, "name": {...}, "desc": {...}, "type": "skillLevel", "skillLevelBonus": 2 }
  ],
  "awakenPriority": { "recommended": 3, "note": { "th": "คุ้มสุดที่ A3 ...", "en": "..." } },
  "breakthrough": [ { "stage": 2, "unlocks": ["monsterlingSlot2"] },
                    { "stage": 4, "unlocks": ["monsterlingSlot3"] } ],
  "recommended": {                // ทั้งหมดเป็น id ที่ต้องมีอยู่จริง → validate ตอน build
    "artifacts": ["blazing-edge"], "monsterlings": ["flare-pup"], "food": ["spicy-stew"],
    "teammates": ["ariel"], "builds": ["jiwon-boss-dps"]
  },
  "images": { "icon": "jiwon-icon.webp", "portrait": "jiwon-portrait.webp", "splash": "jiwon-splash.webp" },
  "source": { "verifiedAt": "2026-09-11", "gameVersion": "1.4.0", "by": "in-game screenshot" }
}
```

### 4.2 Artifact
`id, name, rarity, type, mainStat, subStats[], effect{name,desc}, refineLevels[], recommendedFor[characterId], obtainFrom, images.icon, source`

### 4.3 Monsterling
`id, name, breed, rarity, traits[], baseStats{}, ability{name,desc}, obtain{ method: "capture"|"combine", location, combineRecipe[monsterlingId] }, goodWith[characterId], images.icon, source`

### 4.4 Food
`id, name, category: "entree"|"side", buff{ stat, value, isPercent }, durationMinutes: 30,
exquisite{ buff }, ingredients[{ itemId, qty, swappable: bool }], unlock{ from: "brownie-shop"|"event"|"quest" }, images.icon, source`

### 4.5 Build
`id, characterId, title{}, contentType: "boss"|"pvp"|"story"|"farming", author, updatedAt,
artifacts[], monsterlings[], food{entree, side}, skillPriority[], awakenTarget,
teamComps[{name, members[characterId], note}], pros[], cons[], notes{}`

### 4.6 การบังคับความถูกต้อง

- **zod schema** ต่อทุก entity ใน `src/lib/schema/`
- `scripts/validate-data.ts` รันใน CI + pre-commit hook: เช็ค schema ผ่าน, ทุก id ที่อ้างถึงมีอยู่จริง,
  ไฟล์รูปทุกไฟล์ที่ระบุมีจริงใน `public/images/`, ไม่มี id ซ้ำ
- build จะ **fail** ถ้าข้อมูลพัง — กันข้อมูลผิดหลุดขึ้นเว็บ

---

## 5. หน้าเว็บ

| Route | เนื้อหา |
|---|---|
| `/` | หน้าแรก: ช่องค้นหารวม, ทางลัดไป 5 หมวด, ตัวละครอัปเดตล่าสุด, build ใหม่ |
| `/characters` | ตาราง/กริดการ์ด + กรองตาม element, role, rarity + เรียง + ค้นหาชื่อไทย/อังกฤษ |
| `/characters/[slug]` | **หน้าหลักของโปรเจกต์** (ดูรายละเอียดข้างล่าง) |
| `/artifacts` · `/artifacts/[slug]` | ลิสต์ + กรองตาม rarity/main stat · หน้ารายละเอียด + ใครควรใส่ |
| `/monsterlings` · `/monsterlings/[slug]` | ลิสต์ + กรอง breed/trait · รายละเอียด + สูตร Combine (แสดงเป็นแผนผัง) |
| `/food` · `/food/[slug]` | แยกแท็บ Entree / Side, กรองตามบัฟ · รายละเอียด + วัตถุดิบ + ช่องที่สลับได้ |
| `/builds` · `/builds/[slug]` | กรองตามตัวละคร/ประเภทคอนเทนต์ · หน้า build เต็ม |
| `/about` | ที่มาข้อมูล, เวอร์ชันเกมที่อ้างอิง, ข้อความ disclaimer ลิขสิทธิ์, วิธีส่งข้อมูลแก้ไข |

### หน้าตัวละคร `/characters/[slug]` — โครงหน้า

1. **Hero** — splash art + ชื่อไทย/อังกฤษ + ป้าย rarity/element/role
2. **Stats** — ตารางค่าสเตตัส ระบุชัดว่าวัดที่เลเวล/BT เท่าไร
3. **Skills** — 4 แท็บ (Basic / Switch / Special / Ultimate)
   แต่ละอันมี **สไลเดอร์เลเวล 1–16** เลื่อนแล้วตัวเลขในคำอธิบายเปลี่ยนตาม
   ช่วง 13–16 ขึ้นป้าย "ต้อง Awaken 3 / 5"
4. **Awaken** — ไทม์ไลน์ 6 ขั้น ไฮไลต์ขั้น 3 กับ 5 (+2 skill level) + คำแนะนำว่าหยุดที่ขั้นไหนคุ้ม
5. **Breakthrough** — แสดงช่อง Monsterling ที่ปลดล็อกที่ BT 2 / 4
6. **Recommended** — การ์ด Artifact / Monsterling / อาหาร / เพื่อนร่วมทีม (คลิกข้ามหน้าได้)
7. **Builds** — ลิสต์ build ของตัวนี้
8. **Footer** — `verifiedAt` + เวอร์ชันเกม

### ฟีเจอร์ที่ใช้ร่วมกันทุกหน้า

- ค้นหาแบบ fuzzy (Fuse.js) บน index เล็ก ๆ ที่ generate ตอน build — ไม่ต้องมี backend
- ตัวกรองผูกกับ URL query (`?element=fire&role=dps`) → แชร์ลิงก์ตัวกรองได้
- Dark mode เป็นค่าเริ่มต้น + สลับได้
- Responsive: มือถือเป็น 1 คอลัมน์, การ์ดเป็น list, ตารางสเตตัสมี `overflow-x: auto`

---

## 6. Pipeline รูปภาพ

```
แคปจากเกม (PNG เต็มจอ)
   └─> assets-src/characters/jiwon-splash.png     (ไม่ commit)
         └─> pnpm images                          (scripts/process-images.ts, ใช้ sharp)
               ├─ crop ตามพิกัดใน assets-src/crop.json (ครอปซ้ำได้เหมือนเดิมทุกครั้ง)
               ├─ resize 3 ขนาด: icon 128px / portrait 512px / splash 1280px
               ├─ export .webp (คุณภาพ 82) + .avif
               └─> public/images/characters/jiwon-{icon,portrait,splash}.webp
```

- ตั้งชื่อไฟล์ตายตัว: `<slug>-<variant>.webp` → เดาชื่อจาก id ได้ ไม่ต้องพิมพ์ path เอง
- ใช้ `next/image` + `placeholder="blur"` (สร้าง blurDataURL ตอน build) กันภาพกระตุก
- `validate-data.ts` เตือนถ้ามีรายการที่ยังไม่มีรูป หรือมีรูปที่ไม่มีรายการอ้างถึง (ไฟล์ขยะ)
- ถ้า repo เริ่มใหญ่เกิน ~500MB ค่อยย้ายไป Git LFS หรือ Cloudflare R2

### ⚠️ เรื่องลิขสิทธิ์ (ต้องทำตั้งแต่วันแรก)

ภาพและชื่อทั้งหมดเป็นของ Netmarble / ผู้พัฒนา — เว็บนี้เป็น fan site ไม่ใช่ของทางการ ดังนั้น:
- ใส่ disclaimer ที่ footer ทุกหน้า + หน้า `/about`
- ห้ามใช้โลโก้เกมเป็นโลโก้เว็บ, ห้ามทำให้เข้าใจผิดว่าเป็นเว็บทางการ
- ถ้าจะขึ้นโฆษณา/หารายได้ ให้อ่านนโยบาย fan content ของผู้พัฒนาก่อน

---

## 7. i18n

- `next-intl` กับ route `/(th|en)/...` โดย `/` redirect ไป `/th`
- **ข้อความ UI** (ปุ่ม, หัวตาราง, label) → `src/i18n/th.json` / `en.json`
- **ข้อมูลเกม** (ชื่อ, คำบรรยายสกิล) → อยู่ในไฟล์ JSON ของ entity เป็น `{th, en}` อยู่แล้ว
- กติกา: ถ้า `th` ยังว่าง ให้ fallback ไป `en` แล้วขึ้นป้ายเล็ก ๆ "ยังไม่แปล" — เว็บไม่พังระหว่างทยอยแปล
- ค้นหาต้องเจอทั้งชื่อไทยและอังกฤษ (ยัดทั้งสองภาษาเข้า index)

---

## 8. แผนลงมือ (milestones)

| M | สิ่งที่ได้ | ประมาณการ |
|---|---|---|
| **M0** | ตั้งโปรเจกต์: Next.js + TS + Tailwind + ESLint/Prettier, layout+nav, dark mode, deploy เปล่า ๆ ขึ้น Vercel ให้เห็นของจริง | 0.5 วัน |
| **M1** | zod schema ครบ 5 entity + `validate-data` + `new-entry` + ข้อมูลตัวอย่าง (ตัวละคร 2, artifact 2, monsterling 2, อาหาร 2) + pipeline รูป | 1 วัน |
| **M2** | หน้าตัวละคร: ลิสต์ + กรอง + หน้ารายละเอียดครบ (สไลเดอร์สกิล 1–16, ไทม์ไลน์ Awaken) | 1.5 วัน |
| **M3** | หน้า Artifact + Monsterling (รวมแผนผังสูตร Combine) | 1 วัน |
| **M4** | หน้าอาหาร (Entree/Side, วัตถุดิบ, Exquisite) | 0.5 วัน |
| **M5** | หน้า Build + ลิงก์ไขว้กลับไปตัวละคร | 1 วัน |
| **M6** | ค้นหารวม, i18n อังกฤษครบ, SEO/OG image, sitemap, หน้า `/about` + disclaimer | 1 วัน |
| **M7** | ลงข้อมูลจริงชุดแรก (ตัวละคร 10–15 ตัว + ของที่เกี่ยวข้อง) พร้อมรูป | ต่อเนื่อง |

รวมงานโค้ดราว **6–7 วันทำงาน** ส่วน M7 คือของที่กินเวลาจริงระยะยาว — ซึ่งเป็นเหตุผลที่ M1
(เครื่องมือกรอกข้อมูล + validate) ต้องมาก่อนหน้าเว็บสวย ๆ

### ลำดับที่แนะนำให้เริ่ม

เริ่มที่ **ตัวละคร 1 ตัวให้จบทั้งเส้น** (JSON → รูป → หน้าเว็บ) ก่อนขยายไปตัวอื่น
จะได้เจอปัญหา schema ตั้งแต่ต้นทุน 1 ตัว ไม่ใช่ตอนกรอกไป 15 ตัวแล้ว

---

## 9. คุณภาพและการ deploy

- **CI (GitHub Actions):** typecheck → lint → `validate-data` → `next build` ทุก PR
- **Deploy:** Vercel ต่อกับ branch หลัก (preview URL ให้ทุก PR — รีวิวข้อมูลจากหน้าเว็บจริงได้เลย)
  ทางเลือกฟรี: `output: "export"` + GitHub Pages (ต้องไม่ใช้ฟีเจอร์ฝั่งเซิร์ฟเวอร์ ซึ่งแผนนี้ไม่ใช้อยู่แล้ว)
- **เป้าหมาย performance:** Lighthouse ≥ 90 ทุกหมวดบนมือถือ, หน้าลิสต์โหลด < 1.5s บน 4G
- **Analytics:** Vercel Analytics หรือ Plausible (ไม่ใช้คุกกี้)

---

## 10. ไอเดียต่อยอด (ยังไม่ทำในเฟสแรก)

- **Team Builder** — ลากตัวละครจัดทีม แล้วโชว์ธาตุ/บทบาทที่ขาด
- **Damage Calculator** — คำนวณจากสเตตัส + Artifact + บัฟอาหาร
- **Awaken planner** — กรอกจำนวนตัวซ้ำที่มี → บอกว่าควรทุ่มให้ใครก่อน
- **Tier list** ที่แก้ผ่าน JSON ได้
- **หน้า changelog** ไล่ว่าแต่ละแพตช์แก้อะไรบ้าง (เอาจากฟิลด์ `gameVersion` ที่เก็บไว้อยู่แล้ว)

---

## 11. สิ่งที่ต้องยืนยัน/ตัดสินใจต่อ

1. **เวอร์ชันเกมที่อ้างอิง** — Global หรือ KR? ชื่อและค่าต่างกัน (แผนนี้เผื่อฟิลด์ `gameVersion` ไว้แล้ว)
2. **สูตรการสเกลสกิล** — ตัวเลข 16 เลเวลต่อสกิลต้องเก็บเป็น array ทั้ง 16 ค่า หรือเป็นสูตรคำนวณ?
   (แนะนำ: เก็บเป็น array ก่อน — ตรงกับที่เห็นในเกม ไม่ต้องเดาสูตร)
3. **โดเมน** — จะจดโดเมนเองไหม หรือใช้ `*.vercel.app` ไปก่อน
4. **คนช่วยกรอกข้อมูล** — ถ้ามีหลายคน อาจต้องมีฟอร์ม/เทมเพลต issue บน GitHub ให้ส่งข้อมูลเข้ามา

---

## 12. อัปเดตจากการรีวิว mockup (11 ก.ย. 2026)

ตัดสินใจจากการดู prototype จริง — แผนข้างบนถือตามข้อสรุปนี้เมื่อขัดกัน

### เพิ่ม

- **หมวด Equipment** แยกจาก Artifact — ของสวมใส่ 4 ช่อง (หมวก/เกราะ/รองเท้า/เครื่องประดับ)
  มีค่าหลัก ค่ารอง และโบนัสเมื่อใส่ครบเซ็ต 2/4 ชิ้น
  เป็น entity ใหม่ `data/equipment/<slug>.json` และ `data/meta/sets.json`
- **สถานะลิงก์ของ Monsterling** — ฟิลด์ `linkable: boolean` บางตัวใส่ลิงก์ได้ บางตัวไม่ได้
  แสดงเป็นไอคอนโซ่มุมขวาบนของการ์ด (โซ่ทึบ = ใส่ได้, โซ่มีขีดคร่อม = ใส่ไม่ได้) และกรองได้
- **เครื่องคำนวณดาเมจในหน้า Build** — กดเปิดปิดบัฟแต่ละตัว (Artifact / เซ็ต / อาหาร / Awaken)
  แล้วเห็นตารางไล่ตั้งแต่ ATK พื้นฐานจนถึงดาเมจเฉลี่ยและดาเมจตอนคริติคอล
  สูตรอ่านจาก `data/meta/formula.json` — ดู [`DATA-FOR-AI.md`](DATA-FOR-AI.md) §3

### ตัด

- **อาหารออกจากหน้ารายละเอียดตัวละคร** — ยังมีหน้าอาหารของตัวเอง แต่ไม่โผล่ในการ์ด "ของที่แนะนำ"
  (ที่ว่างเอาไปให้ Equipment แทน)
- **วิธี Combine ออกจากหน้า Monsterling**
- **ลำดับอัปสกิลออกจากหน้า Build**

### ธีมสี — เหลือ 3 สีหลัก

| สี | หน้าที่ |
|---|---|
| **INK** เทาอมเขียวเข้ม | พื้นหลังและตัวอักษร |
| **TEAL** | ทุกอย่างที่กดได้ และสถานะที่เลือกอยู่ |
| **AMBER** | ตัวเลขสำคัญ SSR และ Awaken เท่านั้น |

ผลข้างเคียงที่ต้องรู้: ธาตุไม่มีสีประจำตัวอีกต่อไป แสดงเป็นป้ายข้อความแทน
ถ้าใช้จริงแล้วรู้สึกว่าหาธาตุยาก ค่อยเติมสีธาตุกลับมาเป็นชุดที่ 4 ได้
