"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LangProvider, LangToggle, useLang } from "@/lib/i18n";

const NAV = [
  { href: "/admin", key: "a_nav_home", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
  { href: "/admin/competencies", key: "a_nav_comp", icon: <><path d="M12 2l3 6 6 .9-4.5 4.3 1 6.1L12 16.8 6.5 19.3l1-6.1L3 8.9 9 8z" /></> },
  { href: "/admin/roles", key: "a_nav_roles", icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M17 11a3 3 0 1 0-1-5.8" /><path d="M21 20a5 5 0 0 0-5-5" /></> },
  { href: "/admin/courses", key: "a_nav_courses", icon: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18" /></> },
  { href: "/admin/assign", key: "a_nav_assign", icon: <><path d="M9 11l3 3 8-8" /><path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" /></> },
  { href: "/admin/paths", key: "a_nav_paths", icon: <><circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="M5 8.5v3A3.5 3.5 0 0 0 8.5 15h7A3.5 3.5 0 0 1 19 18.5" /></> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <AdminShell>{children}</AdminShell>
    </LangProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
      setAllowed(["super_admin", "org_admin", "instructor"].includes(p?.role ?? ""));
    })();
  }, [supabase, router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (allowed === null) return <div className="p-10 text-ink/50">{t("a_loading")}</div>;
  if (!allowed)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-display text-2xl">{t("a_denied_h")}</h1>
        <p className="mt-2 text-ink/60">{t("a_denied_p")}</p>
        <Link href="/courses" className="btn-primary mt-6 inline-flex">{t("a_back_learn")}</Link>
      </div>
    );

  const activeNav = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-3 px-5 py-3.5 sm:px-8 lg:px-12">
          <Link href="/admin" className="flex items-center gap-2.5">
            {logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/assets/brand/nabati-logo.png" alt="Nabati" className="h-7 w-auto" onError={() => setLogoOk(false)} />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-ember to-emberdark font-display text-sm font-bold text-white shadow-[0_4px_12px_-2px_rgba(226,35,26,.5)]">N</span>
            )}
            <span className="font-display text-[17px] font-semibold">
              {logoOk ? null : <>Nabati </>}
              <span className="font-body font-normal text-ink-soft">/ Admin</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <LangToggle />
            <Link href="/courses" className="rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">{t("a_learn_mode")}</Link>
            <button onClick={signOut} className="rounded-lg px-3 py-2 text-sm text-ink-soft transition hover:bg-sand hover:text-ink">{t("signout")}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1760px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Panel Admin</div>
          <nav className="space-y-1">
            {NAV.map((n) => {
              const active = activeNav(n.href);
              return (
                <Link key={n.href} href={n.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active ? "bg-ember text-white shadow-soft" : "text-ink-soft hover:bg-sand hover:text-ink"
                  }`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-white/20" : "bg-sand"}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{n.icon}</svg>
                  </span>
                  <span className="font-medium">{t(n.key)}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
