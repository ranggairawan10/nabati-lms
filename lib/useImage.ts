"use client";

import { useEffect, useState } from "react";

// Mencoba beberapa ekstensi pada satu path dasar di folder publik proyek,
// lalu mengembalikan URL pertama yang berhasil dimuat. Tidak perlu Supabase,
// tidak perlu login, dan tidak peduli file-nya JPG atau PNG.
const EXTS = [".jpg", ".jpeg", ".png", ".webp"];

export function useFirstImage(base: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let idx = 0;
    const tryNext = () => {
      if (!active || idx >= EXTS.length) return;
      const img = new Image();
      img.onload = () => { if (active) setUrl(base + EXTS[idx]); };
      img.onerror = () => { idx += 1; tryNext(); };
      img.src = base + EXTS[idx];
    };
    tryNext();
    return () => { active = false; };
  }, [base]);
  return url;
}
