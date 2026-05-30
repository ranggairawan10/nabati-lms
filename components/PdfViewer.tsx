"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PdfViewer({
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
  const [url, setUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.storage
        .from("course-media")
        .createSignedUrl(storagePath, 3600);
      setUrl(data?.signedUrl ?? null);
    })();
  }, [supabase, storagePath]);

  async function markComplete() {
    await supabase.from("lesson_progress").upsert(
      {
        profile_id: profileId,
        lesson_id: lessonId,
        percent: 100,
        status: "completed",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,lesson_id" }
    );
    await supabase.from("learning_events").insert({
      profile_id: profileId,
      verb: "completed",
      object_type: "lesson",
      object_id: lessonId,
    });
    setDone(true);
    onComplete?.();
  }

  return (
    <div>
      {url ? (
        <iframe src={url} className="h-[70vh] w-full rounded-xl border border-sand" />
      ) : (
        <div className="h-[70vh] animate-pulse rounded-xl bg-sand" />
      )}
      <button className="btn-primary mt-4" onClick={markComplete} disabled={done}>
        {done ? "Selesai dibaca" : "Tandai selesai dibaca"}
      </button>
    </div>
  );
}
