"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CourseThumb from "@/components/CourseThumb";
import { useLang } from "@/lib/i18n";

type Course = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  category: string | null;
  duration_minutes: number | null;
};

function HeroPhoto() {
  const supabase = createClient();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.storage.from("course-media").createSignedUrl("ui/hero-main.jpg", 3600);
      if (active && !error && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => { active = false; };
  }, [supabase]);
  if (!url || failed) return null;
  return (
    <div className="relative hidden overflow-hidden rounded-[22px] lg:block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
    </div>
  );
}

export default function CoursesPage() {
  const supabase = createClient();
  const { t } = useLang();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, description, level, category, duration_minutes")
        .eq("status", "published")
        .order("created_at", { ascending: true });
      setCourses(data ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((c) =>
      [c.title, c.description, c.category].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [q, courses]);

  return (
    <div>
      {/* ===== hero ===== */}
      <section className="relative overflow-hidden rounded-[26px] border border-line bg-surface shadow-soft">
        <div className="hero-glow" />
        <div className="relative grid items-stretch gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="px-6 py-12 sm:px-12 sm:py-16 lg:py-20">
            <div className="max-w-2xl">
              <span className="label">{t("hero_kicker")}</span>
              <h1 className="mt-4 font-display text-[34px] font-semibold leading-[1.04] tracking-tight sm:text-6xl">
                {t("hero_pre")}<span className="text-ember">{t("hero_accent")}</span>{t("hero_suf")}
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-base">{t("hero_sub")}</p>

              <div className="mt-7 flex max-w-xl items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 shadow-soft">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a9088" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("search_ph")}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft/70"
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="chip"><b className="font-display text-[15px]">{courses.length}</b> {t("stat_courses")}</span>
                <span className="chip"><b className="font-display text-[15px]">25</b> {t("stat_videos")}</span>
                <span className="chip">{t("stat_target").replace("{n}", "50")}</span>
              </div>
            </div>
          </div>

          <HeroPhoto />
        </div>
      </section>

      {/* ===== katalog ===== */}
      <div className="mb-4 mt-10 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold">{t("catalog_h")}</h2>
        <span className="text-sm text-ink-soft">{filtered.length} {t("count_courses")}</span>
      </div>

      {loading ? (
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card overflow-hidden">
              <div className="h-32 animate-pulse bg-sand" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-24 animate-pulse rounded bg-sand" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-sand" />
                <div className="h-3 w-full animate-pulse rounded bg-sand" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card grid place-items-center px-6 py-16 text-center">
          <p className="text-ink-soft">{q ? t("empty_q").replace("{q}", q) : t("empty_none")}</p>
        </div>
      ) : (
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {filtered.map((c, i) => (
            <Link
              key={c.id}
              href={`/courses/${c.id}`}
              className="card group reveal overflow-hidden hover:-translate-y-1.5 hover:shadow-lift"
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <CourseThumb course={c} level={c.level ? t(`lvl_${c.level}`) : null} />
              <div className="p-5">
                <div className="flex items-center gap-2 text-[11.5px] text-ink-soft">
                  {c.category && <span>{c.category}</span>}
                  {c.duration_minutes && <span>· {c.duration_minutes} {t("dur")}</span>}
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold leading-snug group-hover:text-ember">{c.title}</h3>
                {c.description && <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-soft">{c.description}</p>}
                <div className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-ember">
                  {t("start")}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
