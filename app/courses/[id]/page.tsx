"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VideoPlayer from "@/components/VideoPlayer";
import PdfViewer from "@/components/PdfViewer";
import Quiz from "@/components/Quiz";
import { courseVisual } from "@/lib/assets";
import { useLang } from "@/lib/i18n";

type Lesson = {
  id: string; module_id: string; title: string; content_type: string;
  storage_path: string | null; content_url: string | null; body: string | null; position: number;
};
type Module = { id: string; title: string; position: number };
type Course = { title: string; sequential: boolean; placement_assessment_id: string | null };

const ICON: Record<string, string> = { video: "▶", pdf: "▦", quiz: "✎", link: "↗", text: "¶" };

function Ring({ pct, size = 76 }: { pct: number; size?: number }) {
  const sw = 7;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <span className="absolute font-display text-lg font-semibold text-white">{pct}%</span>
    </div>
  );
}

export default function CoursePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useLang();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [asmtByLesson, setAsmtByLesson] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [tested, setTested] = useState<Set<string>>(new Set());
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
    setTested(new Set((prog ?? []).filter((p) => p.status === "tested").map((p) => p.lesson_id)));
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
      // Urutkan pelajaran mengikuti urutan sesi (modul) dulu, baru posisi di dalam sesi.
      // Tanpa ini, semua "materi" (posisi 0) menumpuk di depan dan urutan sesi kacau.
      const modOrder: Record<string, number> = {};
      (mods ?? []).forEach((m, idx) => { modOrder[m.id] = m.position ?? idx; });
      const ll = ((less ?? []) as Lesson[]).slice().sort((a, b) => {
        const ma = modOrder[a.module_id] ?? 0, mb = modOrder[b.module_id] ?? 0;
        if (ma !== mb) return ma - mb;
        return (a.position ?? 0) - (b.position ?? 0);
      });
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

  // Saat lulus Tes Lewati: tandai sesi yang belum tuntas sebagai 'tested' (jujur,
  // tidak menambah jam fiktif). Dipanggil sekali ketika status placementPassed aktif.
  const testedMarked = useRef(false);
  useEffect(() => {
    if (placementPassed && profileId && !testedMarked.current) {
      testedMarked.current = true;
      (async () => {
        await supabase.rpc("mark_course_tested", { p_course: params.id });
        loadStatus(profileId, lessons.map((l) => l.id));
      })();
    }
  }, [placementPassed, profileId, params.id, supabase, lessons, loadStatus]);

  function isDone(l: Lesson): boolean {
    if (l.content_type === "quiz") return passed.has(asmtByLesson[l.id]);
    return completed.has(l.id) || tested.has(l.id);
  }
  function unlockedAt(i: number): boolean {
    if (!course?.sequential || placementPassed || i === 0) return true;
    return isDone(lessons[i - 1]);
  }

  const total = lessons.length;
  const done = lessons.filter(isDone).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const visual = courseVisual({ id: params.id, title: course?.title ?? "" });

  return (
    <div>
      {/* ===== header banner ===== */}
      <section className="relative overflow-hidden rounded-[26px] border border-line shadow-soft" style={{ backgroundImage: visual.gradient }}>
        <div className="thumb-pat" />
        <div className="relative flex flex-wrap items-center justify-between gap-6 p-7 sm:p-9">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">{t("course_badge")}</span>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-[40px]">{course?.title ?? "Kursus"}</h1>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-2 w-44 overflow-hidden rounded-full bg-white/30">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-medium text-white/90">{done}/{total} {t("done_word")}</span>
            </div>
          </div>
          <div className="shrink-0"><Ring pct={pct} /></div>
        </div>
      </section>

      {course?.sequential && (
        <div className="mt-5 card flex flex-wrap items-center justify-between gap-4 p-4">
          {placementPassed ? (
            <p className="text-sm font-medium text-moss">{t("placement_passed")}</p>
          ) : (
            <>
              <p className="text-sm text-ink-soft">
                {t("placement_q_pre")}<b className="text-ink">{t("placement_name")}</b>{t("placement_q_suf")}
              </p>
              <button className="btn-ghost shrink-0"
                onClick={() => { setShowPlacement(true); setActive(null); }}>
                {t("placement_try")}
              </button>
            </>
          )}
        </div>
      )}

      {/* ===== body ===== */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {modules.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="label mb-3">{m.title}</div>
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
                          activeNow ? "bg-ember text-white shadow-soft"
                          : !unlocked ? "cursor-not-allowed text-ink/35"
                          : "hover:bg-sand"
                        }`}
                      >
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[12px] ${activeNow ? "bg-white/20" : "bg-sand"}`}>
                          {unlocked ? (ICON[l.content_type] ?? "•") : "🔒"}
                        </span>
                        <span className="flex-1 leading-snug">{l.title}</span>
                        {tested.has(l.id) && l.content_type !== "quiz" && !completed.has(l.id) && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${activeNow ? "bg-white/20 text-white" : "bg-amber/15 text-amber"}`}>Teruji</span>
                        )}
                        {isDone(l) && !(tested.has(l.id) && !completed.has(l.id) && l.content_type !== "quiz") && (
                          <span className={activeNow ? "text-white" : "text-moss"}>✓</span>
                        )}
                      </button>
                    </li>
                  );
                })())}
              </ul>
            </div>
          ))}
        </aside>

        <section className="min-w-0">
          <div className="mx-auto max-w-[1040px]">
            {showPlacement && course?.placement_assessment_id ? (
              <>
                <h2 className="mb-4 font-display text-2xl font-semibold">{t("placement_name")}</h2>
                <Quiz assessmentId={course.placement_assessment_id} onComplete={refresh} />
              </>
            ) : !active ? (
              <div className="card grid place-items-center px-6 py-20 text-center text-ink-soft">{t("pick_section")}</div>
            ) : (
              <>
                <h2 className="mb-4 font-display text-2xl font-semibold">{active.title}</h2>
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
                  <p className="text-ink-soft">{t("quiz_unconfigured")}</p>
                )}
                {active.content_type === "text" && (
                  <div className="card p-6 leading-relaxed text-ink/80">{active.body}</div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
