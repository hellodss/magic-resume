
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { HeroUIProvider } from "@heroui/react";
import { useLocale } from "@/i18n/compat/client";
import { useResumeDirectorySync } from "@/hooks/useResumeDirectorySync";
import { flushPendingResumeSyncs } from "@/store/useResumeStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  useResumeDirectorySync();

  useEffect(() => {
    const lifecycle = window.magicResumeDesktop?.lifecycle;
    if (!lifecycle) return;
    return lifecycle.onBeforeClose(async () => {
      await flushPendingResumeSyncs();
    });
  }, []);

  return (
    <HeroUIProvider locale={locale}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="magic-resume-theme"
        >
          {children}
        </ThemeProvider>
    </HeroUIProvider>
  );
}
