"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

type Course = { id: string; title: string; status: string; requirement_type: string; level: string | null };

const REQ_KEY: Record<string, string> = { mandatory: "a_req_mandatory", role_based: "a_req_role", elective: "a_req_elective" };
const REQ_STYLE: Record<string, string> = {
  mandatory: "bg-ember/10 text-emberdark", role_based: "bg-moss/10 text-moss", elective: "bg-ink/5 text-ink/60",
};

export default function AdminCourses() {
  const supabase = createClient();
  const { t } = useLang();
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
      <div className="label">{t("a_nav_courses")}</div>
      <h1 className="mt-1 font-display text-3xl">{t("a_courses_h")}</h1>
      <p className="mt-2 text-ink/60">{t("a_courses_sub")}</p>

      <div className="mt-6 card p-5">
        <div className="label mb-3">{t("a_create_module")}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input sm:col-span-2" placeholder={t("a_ph_module_title")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="input" value={req} onChange={(e) => setReq(e.target.value)}>
            <option value="mandatory">{t("a_opt_mandatory")}</option>
            <option value="role_based">{t("a_opt_role")}</option>
            <option value="elective">{t("a_opt_elective")}</option>
          </select>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="beginner">{t("lvl_beginner")}</option>
            <option value="intermediate">{t("lvl_intermediate")}</option>
            <option value="advanced">{t("lvl_advanced")}</option>
          </select>
        </div>
        <button className="btn-primary mt-4" onClick={add}>{t("a_btn_create_module")}</button>
      </div>

      <div className="mt-8 space-y-2">
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/courses/${c.id}`}
            className="card flex items-center justify-between p-4 transition hover:shadow">
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="mt-0.5 text-xs text-ink/45">{c.level} · {c.status}</div>
            </div>
            <span className={`badge ${REQ_STYLE[c.requirement_type]}`}>{t(REQ_KEY[c.requirement_type])}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
