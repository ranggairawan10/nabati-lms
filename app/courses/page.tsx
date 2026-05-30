"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Course = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  category: string | null;
  duration_minutes: number | null;
};

export default function CoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, level, category, duration_minutes")
        .eq("status", "published")
        .order("created_at", { ascending: true });
      setCourses(data ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  return (
    <div>
      <div className="label">Katalog</div>
      <h1 className="mt-1 font-display text-4xl">Kursus untuk Anda</h1>
      <p className="mt-2 text-ink/60">Pilih kursus untuk mulai belajar.</p>

      {loading ? (
        <p className="mt-10 text-ink/50">Memuat...</p>
      ) : courses.length === 0 ? (
        <p className="mt-10 text-ink/50">
          Belum ada kursus. Jalankan seed.sql di Supabase untuk memuat kursus contoh.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-2 text-xs text-ink/40">
                {c.category && <span>{c.category}</span>}
                {c.level && <span>· {c.level}</span>}
                {c.duration_minutes && <span>· {c.duration_minutes} mnt</span>}
              </div>
              <h2 className="mt-3 font-display text-2xl group-hover:text-ember">{c.title}</h2>
              {c.description && <p className="mt-2 line-clamp-3 text-sm text-ink/60">{c.description}</p>}
              <span className="mt-4 inline-block text-sm font-medium text-ember">Mulai belajar →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
