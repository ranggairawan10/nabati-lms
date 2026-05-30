"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "id" | "en";

const STR: Record<Lang, Record<string, string>> = {
  id: {
    nav_katalog: "Katalog",
    nav_dashboard: "Dashboard",
    nav_admin: "Panel Admin",
    signout: "Keluar",
    tab_home: "Beranda",
    tab_katalog: "Katalog",
    tab_admin: "Admin",
    brand_sub: "Learning",
    hero_kicker: "Human Capital · Organization Design",
    hero_pre: "Bertumbuh bersama, merancang ",
    hero_accent: "masa depan",
    hero_suf: ".",
    hero_sub:
      "Jalur pembelajaran Organization Design untuk seluruh tim Nabati. Video bernarasi, kuis interaktif, dan jejak kompetensi yang terukur.",
    search_ph: "Cari kursus, kompetensi, atau topik...",
    stat_courses: "kursus aktif",
    stat_videos: "video bernarasi",
    stat_target: "🎯 Target {n} jam / tahun",
    catalog_h: "Katalog kursus",
    count_courses: "kursus",
    empty_q: 'Tidak ada kursus yang cocok dengan "{q}".',
    empty_none: "Belum ada kursus. Jalankan seed di Supabase untuk memuat kursus contoh.",
    start: "Mulai belajar",
    dur: "mnt",
    lvl_beginner: "Pemula",
    lvl_intermediate: "Menengah",
    lvl_advanced: "Lanjutan",
  },
  en: {
    nav_katalog: "Catalog",
    nav_dashboard: "Dashboard",
    nav_admin: "Admin Panel",
    signout: "Sign out",
    tab_home: "Home",
    tab_katalog: "Catalog",
    tab_admin: "Admin",
    brand_sub: "Learning",
    hero_kicker: "Human Capital · Organization Design",
    hero_pre: "Grow together, designing the ",
    hero_accent: "future",
    hero_suf: ".",
    hero_sub:
      "An Organization Design learning path for every Nabati team. Narrated videos, interactive quizzes, and measurable competency tracking.",
    search_ph: "Search courses, competencies, or topics...",
    stat_courses: "active courses",
    stat_videos: "narrated videos",
    stat_target: "🎯 Goal {n} hours / year",
    catalog_h: "Course catalog",
    count_courses: "courses",
    empty_q: 'No courses match "{q}".',
    empty_none: "No courses yet. Run the seed in Supabase to load sample courses.",
    start: "Start learning",
    dur: "min",
    lvl_beginner: "Beginner",
    lvl_intermediate: "Intermediate",
    lvl_advanced: "Advanced",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const saved = localStorage.getItem("nabati_lang");
    if (saved === "id" || saved === "en") {
      setLangState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("nabati_lang", l);
      document.documentElement.lang = l;
    }
  };

  const t = (k: string) => STR[lang][k] ?? STR.id[k] ?? k;

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const c = useContext(LangCtx);
  if (!c) return { lang: "id", setLang: () => {}, t: (k: string) => STR.id[k] ?? k };
  return c;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`inline-flex items-center rounded-full border border-line bg-surface p-0.5 text-[11px] font-bold ${className}`}>
      {(["id", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition ${lang === l ? "bg-ink text-white" : "text-ink-soft hover:text-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
