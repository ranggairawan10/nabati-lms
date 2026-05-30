"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type VQ = { id: string; at_seconds: number; type: string; prompt: string; options: string[] };

export default function VideoPlayer({
  lessonId,
  storagePath,
  profileId,
  onComplete,
}: {
  lessonId: string;
  storagePath: string;
  profileId: string;
  onComplete?: () => void;
}) {
  const supabase = createClient();
  const ref = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const lastSaved = useRef(0);
  const resumeAt = useRef(0);

  const [questions, setQuestions] = useState<VQ[]>([]);
  const passedRef = useRef<Set<string>>(new Set());
  const [activeQ, setActiveQ] = useState<VQ | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.storage.from("course-media").createSignedUrl(storagePath, 3600);
      setUrl(data?.signedUrl ?? null);

      const { data: prog } = await supabase
        .from("lesson_progress").select("last_position_sec")
        .eq("lesson_id", lessonId).eq("profile_id", profileId).maybeSingle();
      resumeAt.current = prog?.last_position_sec ?? 0;

      const { data: vq } = await supabase.rpc("get_video_questions", { p_lesson: lessonId });
      setQuestions((vq as VQ[]) ?? []);
    })();
  }, [supabase, storagePath, lessonId, profileId]);

  function onLoadedMetadata() {
    if (ref.current && resumeAt.current > 0) ref.current.currentTime = resumeAt.current;
  }

  async function save(positionSec: number, percent: number, done = false) {
    await supabase.from("lesson_progress").upsert(
      {
        profile_id: profileId, lesson_id: lessonId,
        last_position_sec: Math.floor(positionSec), percent,
        status: done ? "completed" : "in_progress",
        completed_at: done ? new Date().toISOString() : null,
      },
      { onConflict: "profile_id,lesson_id" }
    );
  }

  function onTimeUpdate() {
    const v = ref.current;
    if (!v || !v.duration) return;

    // gerbang pertanyaan di dalam video
    if (!activeQ) {
      const next = questions.find((q) => !passedRef.current.has(q.id));
      if (next && v.currentTime >= next.at_seconds) {
        v.pause();
        if (v.currentTime > next.at_seconds + 0.5) v.currentTime = next.at_seconds; // cegah lompat melewati
        setFeedback(null);
        setActiveQ(next);
        return;
      }
    }

    // simpan progres tiap 5 detik
    if (v.currentTime - lastSaved.current >= 5) {
      lastSaved.current = v.currentTime;
      save(v.currentTime, Math.floor((v.currentTime / v.duration) * 100));
    }
  }

  async function answer(opt: string) {
    if (!activeQ) return;
    const { data: ok } = await supabase.rpc("check_video_answer", { p_question: activeQ.id, p_answer: opt });
    if (ok) {
      passedRef.current.add(activeQ.id);
      setActiveQ(null);
      setFeedback(null);
      ref.current?.play();
    } else {
      setFeedback("Belum tepat. Coba lagi untuk melanjutkan.");
    }
  }

  async function onEnded() {
    const v = ref.current;
    if (!v) return;
    await save(v.duration, 100, true);
    await supabase.from("learning_events").insert({
      profile_id: profileId, verb: "completed", object_type: "lesson", object_id: lessonId,
    });
    onComplete?.();
  }

  if (!url) return <div className="aspect-video animate-pulse rounded-xl bg-sand" />;

  return (
    <div className="relative">
      <video
        ref={ref}
        src={url}
        controls
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        className="aspect-video w-full rounded-xl bg-black"
      />

      {activeQ && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink/85 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <div className="label text-white/60">Pertanyaan · jawab benar untuk lanjut</div>
            <p className="mt-2 text-lg font-medium text-white">{activeQ.prompt}</p>
            <div className="mt-5 space-y-2">
              {activeQ.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => answer(opt)}
                  className="block w-full rounded-xl border border-white/25 bg-white/5 px-4 py-3 text-left text-white transition hover:border-white hover:bg-white/15"
                >
                  {opt}
                </button>
              ))}
            </div>
            {feedback && <p className="mt-4 text-sm text-red-300">{feedback}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
