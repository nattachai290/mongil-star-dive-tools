import { createTranslate } from "@/i18n";
import type { Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = createTranslate(locale);

  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-5xl space-y-2 px-5 py-8 text-sm text-muted">
        <p>{t("footer.disclaimer")}</p>
        <p>{t("footer.verify")}</p>
      </div>
    </footer>
  );
}
