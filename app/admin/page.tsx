"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminHome() {
  const supabase = createClient();
  const [c, setC] = useState({ comp: 0, roles: 0, courses: 0, paths: 0 });

  useEffect(() => {
    (async () => {
      const q = (t: string) => supabase.from(t).select("*", { count: "exact", head: true });
      const [comp, roles, courses, paths] = await Promise.all([
        q("competencies"), q("job_roles"), q("courses"), q("learning_paths"),
      ]);
      setC({ comp: comp.count ?? 0, roles: roles.count ?? 0, courses: courses.count ?? 0, paths: paths.count ?? 0 });
    })();
  }, [supabase]);

  return (
    <div>
      <div className="label">Panel Admin</div>
      <h1 className="mt-1 font-display text-3xl">Penyiapan Pembelajaran</h1>

      <div className="mt-6 card p-5">
        <div className="label mb-3">Alur TNA</div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="badge bg-ember/10 text-emberdark">1. Kompetensi</span>
          <span className="text-ink/30">&rarr;</span>
          <span className="badge bg-ember/10 text-emberdark">2. Analisa Kebutuhan (skill matrix)</span>
          <span className="text-ink/30">&rarr;</span>
          <span className="badge bg-moss/10 text-moss">3. Modul Training</span>
        </div>
        <p className="mt-3 text-sm text-ink/60">
          Mulai dari menyusun kamus kompetensi, petakan ke peran lewat skill matrix, lalu bangun modul yang menutup kesenjangan.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { n: c.comp, l: "Kompetensi", h: "/admin/competencies" },
          { n: c.roles, l: "Peran", h: "/admin/roles" },
          { n: c.courses, l: "Modul/Kursus", h: "/admin/courses" },
          { n: c.paths, l: "Learning Path", h: "/admin/paths" },
        ].map((x) => (
          <Link key={x.l} href={x.h} className="card p-5 transition hover:-translate-y-0.5 hover:shadow">
            <div className="font-display text-4xl">{x.n}</div>
            <div className="mt-1 text-sm text-ink/60">{x.l}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
