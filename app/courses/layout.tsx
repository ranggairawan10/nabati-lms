"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LangProvider, useLang, LangToggle } from "@/lib/i18n";
import { useState } from "react";

function Icon({ d }: { d: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
}

const TABS = [
  { href: "/courses/dashboard", key: "tab_home", icon: <path d="M3 10l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
  { href: "/courses", key: "tab_katalog", icon: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18" /></> },
  { href: "/admin", key: "tab_admin", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
];

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { t } = useLang();
  const [logoOk, setLogoOk] = useState(true);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }
  const isActive = (href: string) =>
    href === "/courses" ? pathname === "/courses" : pathname.startsWith(href);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <Link href="/courses/dashboard" className="flex items-center gap-2.5">
            {logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/assets/brand/nabati-logo.png" alt="Nabati" className="h-7 w-auto" onError={() => setLogoOk(false)} />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-ember to-emberdark font-display text-sm font-bold text-white shadow-[0_4px_12px_-2px_rgba(226,35,26,.5)]">N</span>
            )}
            <span className="font-display text-[17px] font-semibold">
              {logoOk ? null : <>Nabati </>}
              <span className="font-body font-normal text-ink-soft">{t("brand_sub")}</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              <Link href="/courses" className={`rounded-lg px-3 py-2 text-sm transition ${isActive("/courses") ? "bg-sand text-ink" : "text-ink-soft hover:bg-sand hover:text-ink"}`}>{t("nav_katalog")}</Link>
              <Link href="/courses/dashboard" className={`rounded-lg px-3 py-2 text-sm transition ${isActive("/courses/dashboard") ? "bg-sand text-ink" : "text-ink-soft hover:bg-sand hover:text-ink"}`}>{t("nav_dashboard")}</Link>
              <Link href="/admin" className="rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">{t("nav_admin")}</Link>
              <button onClick={signOut} className="rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">{t("signout")}</button>
            </nav>

            <LangToggle />

            <button onClick={signOut} className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-amber to-ember text-white md:hidden" aria-label={t("signout")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-28 pt-7 sm:px-8 sm:pb-12 sm:pt-9">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-paper/90 px-2 pb-3 pt-2 backdrop-blur-md md:hidden">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`flex flex-col items-center gap-1 px-3 text-[10px] transition ${isActive(tab.href) ? "text-ember" : "text-ink-soft"}`}>
            <span className="h-[22px] w-[22px]"><Icon d={tab.icon} /></span>
            {t(tab.key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <Shell>{children}</Shell>
    </LangProvider>
  );
}
