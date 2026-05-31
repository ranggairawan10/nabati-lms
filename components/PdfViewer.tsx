"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// Penampil materi PDF yang merender tiap halaman ke <canvas> memakai pdf.js.
// Tujuan: materi tampil di layar, bisa diperbesar, dan TIDAK ada bilah/tombol
// unduh atau cetak bawaan browser di platform mana pun. Berkas tidak disajikan
// sebagai tautan yang bisa dibuka langsung. (Catatan: tidak ada penampil web
// yang bisa mencegah pengambilan lewat alat pengembang secara mutlak.)
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
  const [done, setDone] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<any>(null);

  const renderAll = useCallback(async (scale: number) => {
    const pdf = pdfRef.current;
    const host = containerRef.current;
    if (!pdf || !host) return;
    host.innerHTML = "";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: scale * 1.4 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = "100%";
      canvas.style.maxWidth = `${viewport.width}px`;
      canvas.style.height = "auto";
      canvas.style.margin = "0 auto 14px";
      canvas.style.display = "block";
      canvas.style.borderRadius = "10px";
      canvas.style.boxShadow = "0 1px 8px rgba(25,22,19,.08)";
      if (ctx) {
        ctx.scale(dpr, dpr);
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
      host.appendChild(canvas);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(false);
      try {
        const { data } = await supabase.storage.from("course-media").createSignedUrl(storagePath, 3600);
        if (!data?.signedUrl) throw new Error("no url");
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const task = pdfjs.getDocument({ url: data.signedUrl });
        const pdf = await task.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        await renderAll(1);
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) { setErr(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, storagePath, renderAll]);

  useEffect(() => {
    if (pdfRef.current && !loading) renderAll(zoom);
  }, [zoom, loading, renderAll]);

  async function markComplete() {
    await supabase.from("lesson_progress").upsert(
      { profile_id: profileId, lesson_id: lessonId, percent: 100, status: "completed", completed_at: new Date().toISOString() },
      { onConflict: "profile_id,lesson_id" }
    );
    await supabase.from("learning_events").insert({
      profile_id: profileId, verb: "completed", object_type: "lesson", object_id: lessonId,
    });
    setDone(true);
    onComplete?.();
  }

  const clamp = (z: number) => Math.min(2, Math.max(0.6, Math.round(z * 10) / 10));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-ink-soft">{numPages > 0 ? `${numPages} halaman` : ""}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => clamp(z - 0.1))} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-sand" aria-label="Perkecil">&minus;</button>
          <span className="w-14 text-center text-sm tabular-nums text-ink-soft">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => clamp(z + 0.1))} className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-sand" aria-label="Perbesar">+</button>
          <button onClick={() => setZoom(1)} className="ml-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink hover:bg-sand">Atur ulang</button>
        </div>
      </div>

      <div
        onContextMenu={(e) => e.preventDefault()}
        className="relative h-[74vh] w-full select-none overflow-auto rounded-xl border border-line bg-sand/40 p-3"
      >
        {loading && <div className="absolute inset-0 m-3 animate-pulse rounded-lg bg-sand" />}
        {err && (
          <div className="grid h-full place-items-center text-center text-sm text-ink-soft">
            Materi belum tersedia. Pastikan berkas sudah diunggah ke Storage pada path yang sesuai.
          </div>
        )}
        <div ref={containerRef} />
      </div>

      <button className="btn-primary mt-4" onClick={markComplete} disabled={done}>
        {done ? "Selesai dibaca" : "Tandai selesai dibaca"}
      </button>
    </div>
  );
}
