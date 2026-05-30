"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Course = { title: string; status: string; requirement_type: string };
type Module = { id: string; title: string; position: number };
type Lesson = { id: string; module_id: string; title: string; content_type: string; storage_path: string | null; position: number };
type Comp = { id: string; name: string };

export default function CourseEditor({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const id = params.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [comps, setComps] = useState<Comp[]>([]);
  const [courseComps, setCourseComps] = useState<{ competency_id: string; target_level: number }[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [asmt, setAsmt] = useState<Record<string, string>>({});

  // form state
  const [ccComp, setCcComp] = useState(""); const [ccLevel, setCcLevel] = useState(3);
  const [modTitle, setModTitle] = useState("");
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [qList, setQList] = useState<{ id: string; prompt: string }[]>([]);

  const loadCore = useCallback(async () => {
    const { data: c } = await supabase.from("courses").select("title, status, requirement_type").eq("id", id).maybeSingle();
    setCourse(c as Course);
    const { data: cc } = await supabase.from("course_competencies").select("competency_id, target_level").eq("course_id", id);
    setCourseComps(cc ?? []);
    const { data: mods } = await supabase.from("modules").select("id, title, position").eq("course_id", id).order("position");
    setModules((mods as Module[]) ?? []);
    const ids = (mods ?? []).map((m) => m.id);
    const { data: less } = ids.length
      ? await supabase.from("lessons").select("id, module_id, title, content_type, storage_path, position").in("module_id", ids).order("position")
      : { data: [] as Lesson[] };
    setLessons((less as Lesson[]) ?? []);
    const { data: a } = await supabase.from("assessments").select("id, lesson_id").eq("course_id", id);
    const m: Record<string, string> = {};
    (a ?? []).forEach((x) => { if (x.lesson_id) m[x.lesson_id] = x.id; });
    setAsmt(m);
  }, [supabase, id]);

  useEffect(() => {
    (async () => {
      await loadCore();
      const { data } = await supabase.from("competencies").select("id, name").order("name");
      setComps((data as Comp[]) ?? []);
    })();
  }, [supabase, loadCore]);

  const compName = (cid: string) => comps.find((c) => c.id === cid)?.name ?? cid;

  async function setReq(v: string) { await supabase.from("courses").update({ requirement_type: v }).eq("id", id); loadCore(); }
  async function togglePublish() {
    const next = course?.status === "published" ? "draft" : "published";
    await supabase.from("courses").update({ status: next }).eq("id", id); loadCore();
  }
  async function addCC() {
    if (!ccComp) return;
    await supabase.from("course_competencies").upsert(
      { course_id: id, competency_id: ccComp, target_level: ccLevel }, { onConflict: "course_id,competency_id" });
    setCcComp(""); loadCore();
  }
  async function addModule() {
    if (!modTitle.trim()) return;
    await supabase.from("modules").insert({ course_id: id, title: modTitle, position: modules.length });
    setModTitle(""); loadCore();
  }
  async function addLesson(moduleId: string, title: string, type: string, path: string) {
    if (!title.trim()) return;
    const pos = lessons.filter((l) => l.module_id === moduleId).length;
    await supabase.from("lessons").insert({
      module_id: moduleId, title, content_type: type,
      storage_path: type === "video" || type === "pdf" ? path || null : null, position: pos,
    });
    loadCore();
  }

  const selectLesson = useCallback(async (l: Lesson) => {
    setSelected(l);
    if (l.content_type === "quiz") {
      const aid = asmt[l.id];
      if (aid) {
        const { data } = await supabase.from("questions").select("id, prompt").eq("assessment_id", aid).order("position");
        setQList(data ?? []);
      } else setQList([]);
    } else if (l.content_type === "video") {
      const { data } = await supabase.from("video_questions").select("id, prompt").eq("lesson_id", l.id).order("at_seconds");
      setQList(data ?? []);
    } else setQList([]);
  }, [supabase, asmt]);

  return (
    <div>
      <a href="/admin/courses" className="text-sm text-ink/50">&larr; Semua modul</a>
      <h1 className="mt-1 font-display text-3xl">{course?.title ?? "Modul"}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={course?.requirement_type ?? "elective"} onChange={(e) => setReq(e.target.value)}>
          <option value="mandatory">Wajib</option>
          <option value="role_based">Berbasis peran</option>
          <option value="elective">Bebas</option>
        </select>
        <button className="btn-ghost" onClick={togglePublish}>
          {course?.status === "published" ? "Tarik (jadikan draft)" : "Terbitkan"}
        </button>
        <span className="text-sm text-ink/50">Status: {course?.status}</span>
      </div>

      {/* Kompetensi (TNA link) */}
      <div className="mt-6 card p-5">
        <div className="label mb-2">Kompetensi yang dikembangkan (kaitan TNA)</div>
        <div className="flex flex-wrap gap-2">
          {courseComps.length === 0 && <span className="text-sm text-ink/40">Belum ada.</span>}
          {courseComps.map((cc) => (
            <span key={cc.competency_id} className="badge bg-moss/10 text-moss">
              {compName(cc.competency_id)} · L{cc.target_level}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select className="input flex-1" value={ccComp} onChange={(e) => setCcComp(e.target.value)}>
            <option value="">Pilih kompetensi...</option>
            {comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input w-24" value={ccLevel} onChange={(e) => setCcLevel(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>L{l}</option>)}
          </select>
          <button className="btn-primary" onClick={addCC}>Kaitkan</button>
        </div>
      </div>

      {/* Sesi & pelajaran */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <input className="input flex-1" placeholder="Judul sesi baru" value={modTitle} onChange={(e) => setModTitle(e.target.value)} />
            <button className="btn-primary" onClick={addModule}>+ Sesi</button>
          </div>
          {modules.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="font-medium">{m.title}</div>
              <ul className="mt-2 space-y-1">
                {lessons.filter((l) => l.module_id === m.id).map((l) => (
                  <li key={l.id}>
                    <button onClick={() => selectLesson(l)}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition ${selected?.id === l.id ? "bg-ink text-white" : "hover:bg-sand"}`}>
                      <span>{l.title}</span>
                      <span className="text-xs opacity-60">{l.content_type}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <AddLesson onAdd={(t, ty, p) => addLesson(m.id, t, ty, p)} />
            </div>
          ))}
        </div>

        <div>
          {!selected ? (
            <div className="card p-5 text-sm text-ink/50">Pilih pelajaran untuk mengisi kuis atau pertanyaan video.</div>
          ) : selected.content_type === "quiz" ? (
            <QuestionEditor
              title={`Soal kuis: ${selected.title}`} existing={qList}
              onAdd={async (prompt, type, opts, correct) => {
                let aid = asmt[selected.id];
                if (!aid) {
                  const { data } = await supabase.from("assessments")
                    .insert({ course_id: id, lesson_id: selected.id, title: selected.title, passing_score: 80 })
                    .select("id").single();
                  aid = data!.id; setAsmt({ ...asmt, [selected.id]: aid });
                }
                await supabase.from("questions").insert({ assessment_id: aid, type, prompt, options: opts, correct_answer: correct, points: 1, position: qList.length });
                selectLesson(selected);
              }}
            />
          ) : selected.content_type === "video" ? (
            <QuestionEditor
              title={`Pertanyaan dalam video: ${selected.title}`} existing={qList} timed
              onAdd={async (prompt, type, opts, correct, at) => {
                await supabase.from("video_questions").insert({ lesson_id: selected.id, at_seconds: at ?? 10, type, prompt, options: opts, correct_answer: correct, position: qList.length });
                selectLesson(selected);
              }}
            />
          ) : (
            <div className="card p-5 text-sm text-ink/50">Pelajaran tipe {selected.content_type} tidak punya pertanyaan.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddLesson({ onAdd }: { onAdd: (title: string, type: string, path: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [type, setType] = useState("video"); const [path, setPath] = useState("");
  if (!open) return <button className="mt-2 text-sm text-ember" onClick={() => setOpen(true)}>+ Tambah pelajaran</button>;
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-sand/50 p-3">
      <input className="input" placeholder="Judul pelajaran" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex gap-2">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="video">Video</option><option value="pdf">PDF</option>
          <option value="quiz">Kuis</option><option value="text">Teks</option>
        </select>
        {(type === "video" || type === "pdf") && (
          <input className="input" placeholder="path Storage (mis. org-design/part-1.mp4)" value={path} onChange={(e) => setPath(e.target.value)} />
        )}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => { onAdd(title, type, path); setTitle(""); setPath(""); setOpen(false); }}>Simpan</button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>Batal</button>
      </div>
    </div>
  );
}

function QuestionEditor({ title, existing, timed, onAdd }: {
  title: string; existing: { id: string; prompt: string }[]; timed?: boolean;
  onAdd: (prompt: string, type: string, opts: string[], correct: string, at?: number) => void;
}) {
  const [prompt, setPrompt] = useState(""); const [type, setType] = useState("mcq");
  const [opts, setOpts] = useState("Benar\nSalah"); const [correct, setCorrect] = useState(""); const [at, setAt] = useState(10);
  return (
    <div className="card p-5">
      <div className="label mb-2">{title}</div>
      <ul className="mb-3 space-y-1 text-sm text-ink/70">
        {existing.map((q, i) => <li key={q.id}>{i + 1}. {q.prompt}</li>)}
        {existing.length === 0 && <li className="text-ink/40">Belum ada soal.</li>}
      </ul>
      <div className="space-y-2">
        {timed && (
          <input className="input" type="number" placeholder="Berhenti di detik ke-" value={at} onChange={(e) => setAt(Number(e.target.value))} />
        )}
        <input className="input" placeholder="Pertanyaan" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="mcq">Pilihan ganda</option><option value="true_false">Benar / Salah</option>
        </select>
        <textarea className="input" rows={3} placeholder="Pilihan (satu per baris)" value={opts} onChange={(e) => setOpts(e.target.value)} />
        <input className="input" placeholder="Jawaban benar (sama persis dengan salah satu pilihan)" value={correct} onChange={(e) => setCorrect(e.target.value)} />
        <button className="btn-primary"
          onClick={() => {
            const arr = opts.split("\n").map((s) => s.trim()).filter(Boolean);
            if (!prompt.trim() || !correct.trim() || arr.length < 2) return;
            onAdd(prompt, type, arr, correct, timed ? at : undefined);
            setPrompt(""); setCorrect("");
          }}>
          Tambah soal
        </button>
      </div>
    </div>
  );
}
