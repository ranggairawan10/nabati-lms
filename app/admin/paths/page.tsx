"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

type Path = { id: string; title: string; path_type: string };
type Course = { id: string; title: string };
type Item = { id: string; course_id: string; position: number; is_required: boolean };

export default function PathsPage() {
  const supabase = createClient();
  const { t } = useLang();
  const [paths, setPaths] = useState<Path[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [active, setActive] = useState<Path | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  const [title, setTitle] = useState(""); const [ptype, setPtype] = useState("linear");
  const [addCourse, setAddCourse] = useState("");

  const loadPaths = useCallback(async () => {
    const { data } = await supabase.from("learning_paths").select("id, title, path_type").order("created_at");
    setPaths((data as Path[]) ?? []);
  }, [supabase]);

  const loadItems = useCallback(async (pid: string) => {
    const { data } = await supabase.from("path_items").select("id, course_id, position, is_required").eq("learning_path_id", pid).order("position");
    setItems((data as Item[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      await loadPaths();
      const { data } = await supabase.from("courses").select("id, title").order("title");
      setCourses((data as Course[]) ?? []);
    })();
  }, [supabase, loadPaths]);

  async function createPath() {
    if (!title.trim()) return;
    await supabase.from("learning_paths").insert({ title, path_type: ptype, status: "draft" });
    setTitle(""); loadPaths();
  }
  async function pick(p: Path) { setActive(p); await loadItems(p.id); }
  async function addItem() {
    if (!active || !addCourse) return;
    await supabase.from("path_items").insert({ learning_path_id: active.id, course_id: addCourse, position: items.length, is_required: true });
    setAddCourse(""); loadItems(active.id);
  }

  const courseName = (cid: string) => courses.find((c) => c.id === cid)?.title ?? cid;

  return (
    <div>
      <div className="label">{t("a_nav_paths")}</div>
      <h1 className="mt-1 font-display text-3xl">{t("a_paths_h")}</h1>
      <p className="mt-2 text-ink/60">{t("a_paths_sub")}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div>
          <div className="card p-4">
            <div className="label mb-2">{t("a_path_create")}</div>
            <input className="input" placeholder={t("a_ph_path_title")} value={title} onChange={(e) => setTitle(e.target.value)} />
            <select className="input mt-2" value={ptype} onChange={(e) => setPtype(e.target.value)}>
              <option value="linear">{t("a_opt_linear")}</option>
              <option value="flexible">{t("a_opt_flexible")}</option>
              <option value="adaptive">{t("a_opt_adaptive")}</option>
            </select>
            <button className="btn-primary mt-3 w-full" onClick={createPath}>{t("a_btn_create")}</button>
          </div>
          <ul className="mt-4 space-y-1">
            {paths.map((p) => (
              <li key={p.id}>
                <button onClick={() => pick(p)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${active?.id === p.id ? "bg-ink text-white" : "hover:bg-sand"}`}>
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {!active ? (
            <p className="text-ink/50">{t("a_path_pick")}</p>
          ) : (
            <div className="card p-5">
              <div className="font-display text-xl">{active.title}</div>
              <ol className="mt-4 space-y-2">
                {items.map((it, i) => (
                  <li key={it.id} className="flex items-center gap-3 rounded-xl bg-sand/50 px-3 py-2 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white">{i + 1}</span>
                    {courseName(it.course_id)}
                  </li>
                ))}
                {items.length === 0 && <p className="text-sm text-ink/40">{t("a_no_modules")}</p>}
              </ol>
              <div className="mt-4 flex gap-2">
                <select className="input flex-1" value={addCourse} onChange={(e) => setAddCourse(e.target.value)}>
                  <option value="">{t("a_ph_add_module_path")}</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button className="btn-primary" onClick={addItem}>{t("a_btn_add")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
