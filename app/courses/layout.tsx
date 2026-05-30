"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-sand bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/courses/dashboard" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ember text-sm font-bold text-white">
              N
            </span>
            <span className="font-display text-lg">
              Learning <span className="text-ink/40">/ ONE GLOBAL HCMS</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/courses/dashboard" className="btn-ghost">Dashboard</Link>
            <Link href="/courses" className="btn-ghost">Katalog</Link>
            <Link href="/admin" className="btn-ghost">Panel Admin</Link>
            <button className="btn-ghost" onClick={signOut}>Keluar</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
