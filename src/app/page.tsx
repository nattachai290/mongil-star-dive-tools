import { DEFAULT_LOCALE } from "@/lib/i18n";
import { BASE_PATH } from "@/lib/base-path";

/**
 * เข้า / มาให้ไปภาษาไทยก่อน สลับเป็นอังกฤษได้จากปุ่มบนหัวเว็บ
 *
 * เว็บเป็นไฟล์ static บน GitHub Pages ไม่มีเซิร์ฟเวอร์ให้ redirect() ทำงาน
 * จึงพาไปด้วย meta refresh แทน และมีลิงก์ไว้เผื่อเบราว์เซอร์ที่ปิดการพาไปอัตโนมัติ
 * layout ราก (src/app/layout.tsx) ไม่มี <html> ของตัวเอง หน้านี้จึงต้องเขียนเองทั้งหน้า
 */
export default function RootPage() {
  const target = `${BASE_PATH}/${DEFAULT_LOCALE}/`;
  return (
    <html lang="th">
      <head>
        <meta httpEquiv="refresh" content={`0; url=${target}`} />
        <link rel="canonical" href={target} />
        <title>MONGIL: STAR DIVE</title>
      </head>
      <body>
        <a href={target}>ไปที่หน้าหลัก</a>
      </body>
    </html>
  );
}
