"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LangProvider, LangToggle, useLang } from "@/lib/i18n";

const NAV = [
  { href: "/admin", key: "a_nav_home" },
  { href: "/admin/competencies", key: "a_nav_comp" },
  { href: "/admin/roles", key: "a_nav_roles" },
  { href: "/admin/courses", key: "a_nav_courses" },
  { href: "/admin/assign", key: "a_nav_assign" },
  { href: "/admin/paths", key: "a_nav_paths" },
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

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
      setAllowed(["super_admin", "org_admin", "instructor"].includes(p?.role ?? ""));
    })();
  }, [supabase, router]);

  if (allowed === null) return <div className="p-10 text-ink/50">{t("a_loading")}</div>;
  if (!allowed)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-display text-2xl">{t("a_denied_h")}</h1>
        <p className="mt-2 text-ink/60">{t("a_denied_p")}</p>
        <Link href="/courses" className="btn-primary mt-6 inline-flex">{t("a_back_learn")}</Link>
      </div>
    );

  return (
    <div className="min-h-screen">
      <header className="border-b border-sand bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ember text-sm font-bold text-white">N</span>
            <span className="font-display text-lg">{t("a_brand")} <span className="text-ink/40">/ Learning</span></span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <Link href="/courses" className="btn-ghost">{t("a_learn_mode")}</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[210px_1fr]">
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`adminlink ${pathname === n.href ? "adminlink-active" : ""}`}>
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
