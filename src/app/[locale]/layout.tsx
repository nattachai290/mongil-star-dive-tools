import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Chakra_Petch, IBM_Plex_Sans_Thai } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { createTranslate } from "@/i18n";
import { DEFAULT_LOCALE, LOCALES, LOCALE_TAG, isLocale } from "@/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mongil-star-dive-tools.vercel.app";
import "../globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin", "thai"], weight: ["500", "600", "700"],
  variable: "--font-chakra-petch", display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"], weight: ["400", "500", "600"],
  variable: "--font-plex-thai", display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = createTranslate(locale);

  return {
    // ต้องมี metadataBase ไม่งั้น hreflang จะออกมาเป็นพาธสัมพัทธ์ ซึ่ง Google ไม่รับ
    metadataBase: new URL(SITE_URL),
    title: { default: t("site.name"), template: `%s · ${t("site.name")}` },
    description: t("site.description"),
    // บอก Google ว่าหน้านี้มีอีกภาษา จะได้ไม่ถูกมองว่าเนื้อหาซ้ำ
    alternates: {
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAG[l], `/${l}`])),
        "x-default": `/${DEFAULT_LOCALE}`,
      },
    },
  };
}

/** ตั้งธีมก่อนหน้าจะ paint กันจอกระพริบตอนโหลด */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(!t)t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={LOCALE_TAG[locale]} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${chakraPetch.variable} ${plexThai.variable} font-sans antialiased`}>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader locale={locale} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} />
        </div>
      </body>
    </html>
  );
}
