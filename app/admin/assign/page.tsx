"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

type Course = { id: string; title: string; requirement_type: string };
type Person = { id: string; full_name: string | null; email: string | null };
type Role = { id: string; name: string };

export default function AssignPage() {
  const supabase = createClient();
  const { t } = useLang();
  const [courses, setCourses] = useState<Course[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [courseId, setCourseId] = useState("");
  const [target, setTarget] = useState<"person" | "role">("person");
  const [personId, setPersonId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [due, setDue] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }, { data: r }] = await Promise.all([
        supabase.from("courses").select("id, title, requirement_type").order("title"),
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("job_roles").select("id, name").order("name"),
      ]);
      setCourses((c as Course[]) ?? []); setPeople((p as Person[]) ?? []); setRoles((r as Role[]) ?? []);
    })();
  }, [supabase]);

  async function assign() {
    setMsg(null);
    if (!courseId) { setMsg(t("a_msg_pick_module")); return; }
    if (mandatory) await supabase.from("courses").update({ requirement_type: "mandatory" }).eq("id", courseId);

    const dueVal = due ? new Date(due).toISOString() : null;
    let targets: string[] = [];
    if (target === "person") {
      if (!personId) { setMsg(t("a_msg_pick_person")); return; }
      targets = [personId];
    } else {
      if (!roleId) { setMsg(t("a_msg_pick_role")); return; }
      const { data } = await supabase.from("profiles").select("id").eq("job_role_id", roleId);
      targets = (data ?? []).map((x) => x.id);
      if (targets.length === 0) { setMsg(t("a_msg_no_people")); return; }
    }
    const rows = targets.map((pid) => ({ profile_id: pid, course_id: courseId, method: "manager", due_date: dueVal }));
    const { error } = await supabase.from("enrollments").upsert(rows, { onConflict: "profile_id,course_id" });
    setMsg(error ? t("a_msg_fail").replace("{e}", error.message) : t("a_msg_success").replace("{n}", String(targets.length)));
  }

  return (
    <div>
      <div className="label">{t("a_nav_assign")}</div>
      <h1 className="mt-1 font-display text-3xl">{t("a_assign_h")}</h1>
      <p className="mt-2 text-ink/60">{t("a_assign_sub")}</p>

      <div className="mt-6 card max-w-xl space-y-4 p-6">
        <div>
          <div className="label mb-1">{t("a_field_module")}</div>
          <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">{t("a_ph_pick_module")}</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div>
          <div className="label mb-1">{t("a_field_assign_to")}</div>
          <div className="flex gap-2">
            <button onClick={() => setTarget("person")}
              className={`btn ${target === "person" ? "btn-primary" : "btn-ghost"}`}>{t("a_btn_person")}</button>
            <button onClick={() => setTarget("role")}
              className={`btn ${target === "role" ? "btn-primary" : "btn-ghost"}`}>{t("a_btn_role")}</button>
          </div>
        </div>

        {target === "person" ? (
          <select className="input" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">{t("a_ph_pick_person")}</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email || p.id}</option>)}
          </select>
        ) : (
          <select className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">{t("a_ph_pick_role")}</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}

        <div>
          <div className="label mb-1">{t("a_field_due")}</div>
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
          {t("a_mark_mandatory")}
        </label>

        <button className="btn-primary w-full" onClick={assign}>{t("a_btn_assign")}</button>
        {msg && <p className="text-sm text-emberdark">{msg}</p>}
      </div>
    </div>
  );
}
