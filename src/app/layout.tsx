import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Sans_Thai } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin", "thai"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra-petch",
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ฐานข้อมูล MONGIL: STAR DIVE",
    template: "%s · ฐานข้อมูล MONGIL: STAR DIVE",
  },
  description:
    "ข้อมูลตัวละคร สกิลและ Awaken, Artifact, Monsterling, อาหาร และ Build guide ของเกม MONGIL: STAR DIVE ภาษาไทย",
};

/** ตั้งธีมก่อนหน้าจะ paint กันจอกระพริบตอนโหลด */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(!t)t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${chakraPetch.variable} ${plexThai.variable} font-sans antialiased`}
      >
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
