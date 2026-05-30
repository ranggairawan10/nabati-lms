"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Beranda" },
  { href: "/admin/competencies", label: "Kamus Kompetensi" },
  { href: "/admin/roles", label: "Peran & Skill Matrix" },
  { href: "/admin/courses", label: "Modul / Kursus" },
  { href: "/admin/assign", label: "Assign Pelatihan" },
  { href: "/admin/paths", label: "Learning Path" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
      setAllowed(["super_admin", "org_admin", "instructor"].includes(p?.role ?? ""));
    })();
  }, [supabase, router]);

  if (allowed === null) return <div className="p-10 text-ink/50">Memuat...</div>;
  if (!allowed)
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-display text-2xl">Akses ditolak</h1>
        <p className="mt-2 text-ink/60">Panel admin hanya untuk admin atau instruktur.</p>
        <Link href="/courses" className="btn-primary mt-6 inline-flex">Kembali belajar</Link>
      </div>
    );

  return (
    <div className="min-h-screen">
      <header className="border-b border-sand bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ember text-sm font-bold text-white">N</span>
            <span className="font-display text-lg">Panel Admin <span className="text-ink/40">/ Learning</span></span>
          </div>
          <Link href="/courses" className="btn-ghost">Mode Belajar</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[210px_1fr]">
        <nav className="space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`adminlink ${pathname === n.href ? "adminlink-active" : ""}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
