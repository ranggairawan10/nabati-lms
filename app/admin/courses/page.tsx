"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Course = { id: string; title: string; status: string; requirement_type: string; level: string | null };

const REQ_LABEL: Record<string, string> = { mandatory: "Wajib", role_based: "Berbasis Peran", elective: "Bebas" };
const REQ_STYLE: Record<string, string> = {
  mandatory: "bg-ember/10 text-emberdark", role_based: "bg-moss/10 text-moss", elective: "bg-ink/5 text-ink/60",
};

export default function AdminCourses() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState("");
  const [req, setReq] = useState("elective");
  const [level, setLevel] = useState("beginner");

  const load = useCallback(async () => {
    const { data } = await supabase.from("courses")
      .select("id, title, status, requirement_type, level").order("created_at", { ascending: false });
    setCourses((data as Course[]) ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!title.trim()) return;
    await supabase.from("courses").insert({ title, requirement_type: req, level, status: "draft", visibility: "organization" });
    setTitle("");
    await load();
  }

  return (
    <div>
      <div className="label">Modul / Kursus</div>
      <h1 className="mt-1 font-display text-3xl">Modul Training</h1>
      <p className="mt-2 text-ink/60">Hasil dari analisa kebutuhan. Tandai wajib, berbasis peran, atau bebas.</p>

      <div className="mt-6 card p-5">
        <div className="label mb-3">Buat modul baru</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input sm:col-span-2" placeholder="Judul modul" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="input" value={req} onChange={(e) => setReq(e.target.value)}>
            <option value="mandatory">Wajib (mandatory)</option>
            <option value="role_based">Berbasis peran (skill matrix)</option>
            <option value="elective">Bebas (elective)</option>
          </select>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <button className="btn-primary mt-4" onClick={add}>Buat modul</button>
      </div>

      <div className="mt-8 space-y-2">
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/courses/${c.id}`}
            className="card flex items-center justify-between p-4 transition hover:shadow">
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="mt-0.5 text-xs text-ink/45">{c.level} · {c.status}</div>
            </div>
            <span className={`badge ${REQ_STYLE[c.requirement_type]}`}>{REQ_LABEL[c.requirement_type]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
