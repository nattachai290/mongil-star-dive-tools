# ตัดรูปมอนจากหน้า Monster Codex

สคริปต์ `npm run crop:codex` ตัดรูปมอนออกจากภาพแคปเต็มจอ **ทีละ 8 ตัวต่อภาพ**
ชื่อไฟล์ที่ได้มาจาก `slug` ในสมุดภาพมอนโดยตรง ไม่ได้ตั้งเอง รูปจึงไม่มีทางหลุดจากข้อมูล

## เตรียมครั้งเดียว

ต้องทำบน**เครื่องของคุณ** (ไม่ใช่ใน session นี้ — ผมเห็นรูปที่คุณส่งมาได้ แต่ไฟล์ไม่ได้อยู่บนดิสก์ที่ผมเข้าถึง)

```bash
git clone https://github.com/nattachai290/mongil-star-dive-tools
cd mongil-star-dive-tools
git checkout claude/nifty-newton-ezuuoi
npm ci
```

ต้องมี Node 20 ขึ้นไป

## ขั้นตอนทุกครั้ง

### 1. แคปหน้า Monster Codex

**เลื่อนให้แถวบนสุดเห็นการ์ดเต็มใบ** (เห็นรูปมอน ไม่ใช่เห็นแค่แถบชื่อ) แล้วแคปเต็มจอ
ภาพหนึ่งจะได้ 8 ตัว คือแถวบน 4 + แถวล่าง 4

> ภาพที่แถวบนโดนตัดครึ่ง (เห็นแค่ชื่อกับคำว่า Complete) **ใช้ไม่ได้** เพราะพิกัดจะเลื่อน

165 ตัวในสมุดหลัก ÷ 8 = ประมาณ **21 ภาพ**

### 2. วางไว้ใน `assets-src/codex/` และตั้งชื่อตามเลขใบแรกในภาพ

โฟลเดอร์นี้ไม่ได้ถูก commit (ภาพแคปดิบไม่ขึ้น git) หลัง clone จะยังไม่มี —
รัน `npm run crop:codex` ครั้งแรกมันจะสร้างให้เอง หรือ `mkdir -p assets-src/codex` ก็ได้

```
assets-src/codex/
  1.png      <- ภาพที่แถวบนเริ่มจาก No.1  (ได้ No.1–8)
  9.png      <- ได้ No.9–16
  17.png     <- ได้ No.17–24
  ...
```

ชื่อต้องเป็นตัวเลขล้วน นามสกุล `.png` `.jpg` หรือ `.jpeg`

### 3. เช็คกรอบก่อน

```bash
npm run crop:codex -- --preview
```

ได้ไฟล์ PNG ใน `assets-src/preview/` เปิดดูว่าตัดตรงรูปมอนพอดีไหม

**ถ้าเบี้ยว** แก้ตัวเลขใน `assets-src/codex-crop.json` แล้วรันใหม่ ไม่ต้องแตะโค้ด

```jsonc
{
  "referenceWidth": 1920,          // ความกว้างภาพที่ใช้วัดพิกัด
  "box": { "width": 168, "height": 140 },
  "columnsX": [768, 1038, 1308, 1578],
  "rowsY": [208, 532],
  "output": { "size": 256, "quality": 88 }
}
```

ภาพความกว้างอื่น (เช่น 2340 บนมือถือ) ใช้ได้เลย สคริปต์ย่อ/ขยายพิกัดให้เอง

### 4. ตัดจริง

```bash
npm run crop:codex
```

ได้ `public/images/monsterlings/cappy-icon.webp` ฯลฯ ขนาด 256×256

### 5. commit

```bash
git add public/images/monsterlings
git commit -m "Add monster portraits"
git push
```

## สิ่งที่สคริปต์เตือนให้

**ตัวที่ยังไม่มี slug จะถูกข้าม** พร้อมบอกว่าข้ามตัวไหน ตอนนี้ทั้ง 169 ตัวมี slug ครบแล้ว จึงไม่มีตัวไหนถูกข้าม

**รูปที่เกือบไม่มีสีจะถูกเตือน** เพราะมอนที่ยังจับไม่ครบ การ์ดในเกมโชว์เป็นเงาสีเทา
ครอปออกมาก็ได้เงา ไม่ใช่รูปจริง

จากภาพที่เคยส่งมา ตัวเหล่านี้ยังจับไม่ครบ — **จับให้ครบก่อนแคป** ไม่งั้นได้เงา:

| No. | ชื่อ | No. | ชื่อ | No. | ชื่อ |
|---|---|---|---|---|---|
| 4 | Leafy Mama | 63 | Monk's Shadow | 146 | Chipmunk Spirit |
| 17 | Scarlet Queen | 66 | Tealtaur | 153 | Sun Lizarcher |
| 24 | Green Cappy Bro | 80 | Greenpadupa | 155 | Master Lizcout |
| 33 | Golden Spark Slime | 117 | Silvershell | 157 | Krokomander |
| 46 | Leafymander | 123 | Bleacher Bunnie | 161 | Treetoise |
| 56 | Frostbite | | | 163 | Suhwa |

การเตือนใช้วิธีดูว่าสาม channel สี R G B ใกล้กันแค่ไหน **มอนบางตัวสีเทาจริง ๆ ก็ติดรายการนี้ได้**
(เช่น Ashen Mask, Inklet) ดูรูปก่อนตัดสินใจเสมอ

## หมายเหตุ

`assets-src/` อยู่ใน `.gitignore` (ยกเว้น `codex-crop.json` ที่ต้อง commit) — ภาพแคปดิบไม่ถูก commit มีแต่ไฟล์ `.webp` ที่ตัดแล้วเท่านั้น
ทำให้ repo ไม่บวม และถ้าวันหลังอยากเปลี่ยนขนาดรูป ก็แค่แคปใหม่แล้วรันสคริปต์ซ้ำ
