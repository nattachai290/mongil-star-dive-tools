# หลังบ้านที่ AI อ่านแล้ววิเคราะห์ต่อได้

เอกสารนี้ออกแบบ `data/` ให้ AI (หรือสคริปต์ใด ๆ) อ่านแล้วตอบคำถามพวกนี้ได้เองโดยไม่ต้องเดา

1. ตัวละครนี้สกิลเป็นยังไง จุดแข็งจุดอ่อนอยู่ตรงไหน
2. เข้ากับใครได้บ้าง เพราะอะไร
3. จัดทีม 3 ตัวให้หน่อย
4. ใส่ Artifact / Equipment อันไหนดี
5. Monsterling ตัวไหนเหมาะ
6. ควรกินอาหารอะไรก่อนลง

## หลักการเดียวที่ทุกอย่างยึด

> **เก็บตัวเลขกับโครงสร้าง ไม่ใช่ประโยคบรรยาย**

คำบรรยายภาษาไทย/อังกฤษยังมีอยู่ (คนต้องอ่าน) แต่มันคือ *ผลลัพธ์* ไม่ใช่ *แหล่งข้อมูล*
ทุกเอฟเฟกต์ต้องมีรูปแบบที่คำนวณต่อได้ ไม่งั้น AI ต้องตีความประโยค ซึ่งพังเมื่อไหร่ก็ได้

เทียบกัน:

```jsonc
// ❌ อ่านได้แต่คำนวณต่อไม่ได้ ต้องเดาว่า 30% คิดกับอะไร
"desc": { "th": "เมื่อใช้อัลติเมต เพิ่มความเสียหายคริติคอล 30% นาน 10 วิ" }

// ✅ คำนวณต่อได้ และยังสร้างประโยคข้างบนกลับมาได้
"effects": [{
  "kind": "buff", "stat": "critDmg", "value": 30, "unit": "percent",
  "target": "self", "trigger": "onUltimate", "durationSec": 10
}]
```

## 1. โครงเอฟเฟกต์ (ใช้ร่วมกันทุก entity)

สกิล, Artifact, Equipment, เซ็ต, Monsterling และอาหาร **ใช้โครงเดียวกันหมด**
เพราะทั้งหมดคือ "สิ่งที่ไปบวกเข้าตัวละคร" — ทำให้รวมบัฟทั้งหมดได้ด้วยโค้ดชุดเดียว

```jsonc
{
  "kind":   "damage | buff | debuff | heal | shield | utility",
  "stat":   "atk | def | hp | critRate | critDmg | spd | dmgDealt | dmgTaken | elementDmg | cooldown",
  "value":  30,
  "unit":   "percent | flat | seconds",
  "target": "self | ally | team | enemy | allEnemies",
  "trigger":"passive | onHit | onSwitch | onUltimate | onSkill | hpBelow | always",
  "condition": { "hpBelowPercent": 40 },   // ใส่เมื่อมีเงื่อนไขเท่านั้น
  "durationSec": 10,
  "maxStacks": 1,
  "element": "fire"                         // ใส่เมื่อเอฟเฟกต์จำกัดเฉพาะธาตุ
}
```

คำที่ใช้ได้ทั้งหมดอยู่ใน `data/meta/vocabulary.json` — **ห้ามคิดคำใหม่นอกไฟล์นี้**
`validate:data` จะ fail ถ้าเจอค่าที่ไม่มีในรายการ นี่คือสิ่งที่ทำให้ AI เชื่อข้อมูลได้

## 2. ฟิลด์ที่ทำให้ "จัดทีม" เป็นไปได้

ตัวละครแต่ละตัวประกาศว่า **ให้อะไรทีม** และ **ขาดอะไร** การจัดทีมกลายเป็นการจับคู่ให้ตรงกัน

```jsonc
{
  "id": "nova",
  "role": "dps",
  "tags": ["burst", "aoe", "frontload"],

  "provides": [
    { "stat": "defShred", "value": 20, "target": "enemy", "durationSec": 10 }
  ],
  "needs": ["critDmgBuff", "sustain"],

  "playstyle": {
    "rotationNote": { "th": "ต้องรอคูลดาวน์ Special ก่อนปล่อยอัลติเมต", "en": "..." },
    "difficulty": "medium",
    "energyHungry": true
  }
}
```

- `provides` — บัฟ/ดีบัฟที่ตัวนี้ยื่นให้คนอื่น (โครงเอฟเฟกต์เดิม)
- `needs` — สิ่งที่ตัวนี้อยากได้จากเพื่อน ใช้คำจาก `vocabulary.json` เช่นกัน
- ทีมที่ดี = `needs` ของแต่ละคนถูกคนอื่นใน `provides` ครอบ + ครบบทบาท + ธาตุไม่ชนกันเกินจำเป็น

กติกาการจัดทีมเก็บแยกใน `data/meta/team-rules.json` ไม่ฝังในโค้ด:

```jsonc
{
  "teamSize": 3,
  "require": [
    { "anyRole": ["dps"], "min": 1 },
    { "anyRole": ["healer", "support"], "min": 1 }
  ],
  "prefer": [
    { "rule": "coverNeeds", "weight": 3, "note": "needs ของ dps ถูก provides ของเพื่อนครอบ" },
    { "rule": "elementSpread", "weight": 1 }
  ],
  "verified": false
}
```

> ⚠️ `"verified": false` แปลว่ากติกานี้ **ยังไม่ยืนยันกับเกมจริง** — AI ต้องบอกผู้ใช้ตรง ๆ
> ว่าคำแนะนำมาจากกติกาที่ยังไม่ยืนยัน ไม่ใช่พูดเหมือนเป็นความจริง

## 3. สูตรดาเมจอยู่ในไฟล์ ไม่ใช่ในโค้ด

`data/meta/formula.json` เป็นแหล่งเดียวที่ทั้งเครื่องคำนวณบนเว็บและ AI ใช้ร่วมกัน
ถ้าเกมแก้สูตร แก้ไฟล์นี้ไฟล์เดียว ตัวเลขทุกที่เปลี่ยนตามพร้อมกัน

```jsonc
{
  "gameVersion": "1.4.0",
  "verified": false,
  "steps": [
    { "id": "atkTotal", "expr": "atkBase * (1 + sum(buffs.atk.percent)/100) + sum(buffs.atk.flat)" },
    { "id": "raw",      "expr": "atkTotal * skillPercent / 100" },
    { "id": "afterDef", "expr": "raw * (1 - enemyDef / (enemyDef + defConstant))" },
    { "id": "avg",      "expr": "afterDef * (1 + critRate/100 * (critDmg/100 - 1))" },
    { "id": "onCrit",   "expr": "afterDef * critDmg / 100" }
  ],
  "constants": { "defConstant": 1400 },
  "notYetModeled": ["ค่าต้านธาตุ", "บัฟจากเพื่อนร่วมทีม", "ดาเมจต่อเนื่อง"]
}
```

`notYetModeled` สำคัญมาก — เป็นรายการที่ AI **ต้องหยิบไปเตือนผู้ใช้** เวลาให้ตัวเลข

## 4. จุดที่ AI เข้ามาอ่าน

### อ่านจากใน repo (กรณีผมทำงานในโปรเจกต์นี้)

อ่าน `data/**/*.json` ตรง ๆ ได้เลย ไม่ต้องมี API

### อ่านจากข้างนอก (กรณี agent อื่นหรือ session ใหม่)

`npm run export:dataset` รวมทุกอย่างเป็นไฟล์เดียวตอน build:

```
public/api/dataset.json     ทุก entity + meta ในไฟล์เดียว พร้อม gameVersion และ generatedAt
public/api/characters.json  แยกรายหมวดสำหรับคนที่ต้องการแค่บางส่วน
public/llms.txt             อธิบายว่าแต่ละไฟล์คืออะไร ฟิลด์ไหนแปลว่าอะไร ควรเริ่มอ่านตรงไหน
```

`llms.txt` คือหน้าแรกที่ agent ควรอ่าน — บอกโครงสร้าง คำศัพท์ที่ใช้ได้ และข้อห้าม
เพื่อให้ agent ที่ไม่เคยเห็นโปรเจกต์นี้ใช้ข้อมูลถูกตั้งแต่ครั้งแรก

## 5. ข้อห้ามที่เขียนไว้ในข้อมูลเลย

ทุก entity มีบล็อกนี้:

```jsonc
"source": {
  "verifiedAt": "2026-09-11",
  "gameVersion": "1.4.0",
  "by": "in-game screenshot",
  "fieldsUnverified": ["skills.ultimate.scaling"]
}
```

กติกาที่ AI ต้องทำตาม:

1. **ฟิลด์ว่าง = ไม่มีข้อมูล ไม่ใช่ศูนย์** ห้ามเติมค่าเอง ให้ตอบว่า "ยังไม่มีข้อมูลตัวนี้"
2. **ฟิลด์ที่อยู่ใน `fieldsUnverified` ต้องกำกับเสมอ** ว่ายังไม่ยืนยัน
3. **`verified: false` ที่ระดับ meta** (สูตรดาเมจ / กติกาทีม) ต้องบอกผู้ใช้ก่อนให้คำแนะนำ
4. **ห้ามเอาความรู้จากเกมอื่นมาเติม** ถ้าไม่มีในไฟล์ ให้บอกว่าไม่มี

ข้อ 4 สำคัญที่สุด — เว็บ database ที่ให้ข้อมูลผิดแบบดูน่าเชื่อ แย่กว่าไม่มีข้อมูลเลย

## 6. ตัวอย่างที่ตอบได้หลังทำครบ

| คำถาม | ใช้ฟิลด์อะไร |
|---|---|
| "โนวาสกิลเป็นไง" | `skills.*.effects` + `tags` + `playstyle` |
| "เข้ากับใครได้" | `needs` ของโนวา จับกับ `provides` ของตัวอื่น |
| "จัดทีม 3 ตัว" | `team-rules.json` + `provides`/`needs`/`role`/`element` ของทุกตัว |
| "ใส่อุปกรณ์อะไร" | รวม `effects` ของ Artifact/Equipment/เซ็ต เข้า `formula.json` แล้วเทียบดาเมจ |
| "Monsterling ตัวไหน" | `effects` + `linkable` + ช่องที่ปลดล็อกตาม `breakthrough` |
| "กินอาหารอะไร" | `effects` ของ entree + side ที่ไม่ชนกัน เทียบผลผ่าน `formula.json` |

ทุกข้อในตารางนี้ตอบด้วย **การคำนวณจากข้อมูล** ไม่ใช่ความเห็นลอย ๆ
และอ้างกลับไปที่ `verifiedAt` ของแต่ละรายการได้เสมอ

## 7. ลำดับทำ

| ขั้น | ทำอะไร |
|---|---|
| A | `vocabulary.json` — ตกลงคำศัพท์ทั้งหมดก่อน (ทุกอย่างหลังจากนี้อ้างไฟล์นี้) |
| B | เพิ่ม `effects` เข้า zod schema ของทุก entity + ให้ `validate:data` ตรวจคำศัพท์ |
| C | `formula.json` + ให้เครื่องคำนวณบนหน้า Build อ่านจากไฟล์นี้ |
| D | `provides` / `needs` / `tags` ในตัวละคร |
| E | `team-rules.json` + สคริปต์จัดทีมที่ทั้งเว็บและ AI เรียกใช้ได้ |
| F | `export:dataset` + `llms.txt` |

ทำ A–C ก่อนลงข้อมูลจริงเยอะ ๆ ไม่งั้นต้องกลับมาแก้ทุกไฟล์
