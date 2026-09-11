import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/** เข้า / มาให้ไปภาษาไทยก่อน สลับเป็นอังกฤษได้จากปุ่มบนหัวเว็บ */
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
