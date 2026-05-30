"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VideoPlayer from "@/components/VideoPlayer";
import PdfViewer from "@/components/PdfViewer";
import Quiz from "@/components/Quiz";

type Lesson = {
  id: string; module_id: string; title: string; content_type: string;
  storage_path: string | null; content_url: string | null; body: string | null; position: number;
};
type Module = { id: string; title: string; position: number };
type Course = { title: string; sequential: boolean; placement_assessment_id: string | null };

const ICON: Record<string, string> = { video: "▶", pdf: "▦", quiz: "✎", link: "↗", text: "¶" };

export default function CoursePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [asmtByLesson, setAsmtByLesson] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Lesson | null>(null);
  const [showPlacement, setShowPlacement] = useState(false);

  const loadStatus = useCallback(async (pid: string, lessonIds: string[]) => {
    if (lessonIds.length === 0) return;
    const [{ data: prog }, { data: att }] = await Promise.all([
      supabase.from("lesson_progress").select("lesson_id, status").eq("profile_id", pid).in("lesson_id", lessonIds),
      supabase.from("assessment_attempts").select("assessment_id, passed").eq("profile_id", pid),
    ]);
    setCompleted(new Set((prog ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id)));
    setPassed(new Set((att ?? []).filter((a) => a.passed).map((a) => a.assessment_id)));
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      const pid = auth.user.id;
      setProfileId(pid);

      const { data: c } = await supabase.from("courses")
        .select("title, sequential, placement_assessment_id").eq("id", params.id).maybeSingle();
      setCourse(c as Course);

      await supabase.from("enrollments").upsert(
        { profile_id: pid, course_id: params.id }, { onConflict: "profile_id,course_id" });

      const { data: mods } = await supabase.from("modules")
        .select("id, title, position").eq("course_id", params.id).order("position");
      setModules(mods ?? []);
      const modIds = (mods ?? []).map((m) => m.id);

      const { data: less } = modIds.length
        ? await supabase.from("lessons").select("*").in("module_id", modIds).order("position")
        : { data: [] as Lesson[] };
      const ll = (less ?? []) as Lesson[];
      setLessons(ll);
      setActive(ll[0] ?? null);

      const { data: asmts } = await supabase.from("assessments")
        .select("id, lesson_id").eq("course_id", params.id);
      const map: Record<string, string> = {};
      (asmts ?? []).forEach((a) => { if (a.lesson_id) map[a.lesson_id] = a.id; });
      setAsmtByLesson(map);

      await loadStatus(pid, ll.map((l) => l.id));
    })();
  }, [supabase, params.id, router, loadStatus]);

  const refresh = useCallback(() => {
    if (profileId) loadStatus(profileId, lessons.map((l) => l.id));
  }, [profileId, lessons, loadStatus]);

  const placementPassed = !!course?.placement_assessment_id && passed.has(course.placement_assessment_id);

  function isDone(l: Lesson): boolean {
    if (l.content_type === "quiz") return passed.has(asmtByLesson[l.id]);
    return completed.has(l.id);
  }
  function unlockedAt(i: number): boolean {
    if (!course?.sequential || placementPassed || i === 0) return true;
    return isDone(lessons[i - 1]);
  }

  const total = lessons.length;
  const done = lessons.filter(isDone).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="label">Kursus</div>
      <h1 className="mt-1 font-display text-4xl">{course?.title ?? "Kursus"}</h1>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 w-48 overflow-hidden rounded-full bg-sand">
          <div className="h-full bg-moss transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm text-ink/60">{done}/{total} selesai</span>
      </div>

      {course?.sequential && (
        <div className="mt-5 card flex items-center justify-between gap-4 p-4">
          {placementPassed ? (
            <p className="text-sm text-moss">Tes Lewati lulus. Semua bagian terbuka, Anda bebas memilih urutan.</p>
          ) : (
            <>
              <p className="text-sm text-ink/70">
                Sudah menguasai materinya? Ikuti <b>Tes Lewati</b>. Skor 80 ke atas langsung membuka semua bagian.
              </p>
              <button className="btn-ghost shrink-0"
                onClick={() => { setShowPlacement(true); setActive(null); }}>
                Coba Tes Lewati
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-6">
          {modules.map((m) => (
            <div key={m.id}>
              <div className="label mb-2">{m.title}</div>
              <ul className="space-y-1">
                {lessons.map((l, i) => l.module_id === m.id && (() => {
                  const unlocked = unlockedAt(i);
                  const activeNow = active?.id === l.id && !showPlacement;
                  return (
                    <li key={l.id}>
                      <button
                        disabled={!unlocked}
                        onClick={() => { if (unlocked) { setShowPlacement(false); setActive(l); } }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          activeNow ? "bg-ember text-white"
                          : !unlocked ? "cursor-not-allowed text-ink/35"
                          : "hover:bg-sand"
                        }`}
                      >
                        <span className="opacity-80">{unlocked ? (ICON[l.content_type] ?? "•") : "🔒"}</span>
                        <span className="flex-1">{l.title}</span>
                        {isDone(l) && <span className={activeNow ? "text-white" : "text-moss"}>✓</span>}
                      </button>
                    </li>
                  );
                })())}
              </ul>
            </div>
          ))}
        </aside>

        <section>
          {showPlacement && course?.placement_assessment_id ? (
            <>
              <h2 className="mb-4 font-display text-2xl">Tes Lewati</h2>
              <Quiz assessmentId={course.placement_assessment_id} onComplete={refresh} />
            </>
          ) : !active ? (
            <p className="text-ink/50">Pilih bagian di samping untuk mulai.</p>
          ) : (
            <>
              <h2 className="mb-4 font-display text-2xl">{active.title}</h2>
              {profileId && active.content_type === "video" && active.storage_path && (
                <VideoPlayer lessonId={active.id} storagePath={active.storage_path} profileId={profileId} onComplete={refresh} />
              )}
              {profileId && active.content_type === "pdf" && active.storage_path && (
                <PdfViewer lessonId={active.id} storagePath={active.storage_path} profileId={profileId} onComplete={refresh} />
              )}
              {active.content_type === "quiz" && asmtByLesson[active.id] && (
                <Quiz assessmentId={asmtByLesson[active.id]} onComplete={refresh} />
              )}
              {active.content_type === "quiz" && !asmtByLesson[active.id] && (
                <p className="text-ink/50">Kuis belum dikonfigurasi.</p>
              )}
              {active.content_type === "text" && (
                <div className="card p-6 leading-relaxed text-ink/80">{active.body}</div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
