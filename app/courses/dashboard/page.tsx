"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";
import { useFirstImage } from "@/lib/useImage";

// Memetakan ikon badge (dari data) ke gambar di folder publik proyek.
// Ekstensi (.png/.jpg/...) dideteksi otomatis. Bila gambar belum ada, kartu
// tetap tampil tanpa gambar, jadi tidak ada yang rusak.
const BADGE_IMG: Record<string, string> = {
  "ti-flag": "/assets/badges/first-step",
  "ti-star": "/assets/badges/perfect-score",
  "ti-flame": "/assets/badges/streak-7",
  "ti-clock": "/assets/badges/hours-50",
  "ti-trophy": "/assets/badges/emerging-leader",
};

function BadgeCard({ b, earnedLabel, lockedLabel }: {
  b: { name: string; icon: string; earned: boolean };
  earnedLabel: string;
  lockedLabel: string;
}) {
  const base = BADGE_IMG[b.icon] ?? "";
  const url = useFirstImage(base);
  return (
    <div className={`rounded-xl p-3 text-center text-xs ${b.earned ? "bg-moss/10" : "bg-sand/70"}`}>
      {base && url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className={`mx-auto mb-2 h-14 w-14 object-contain transition ${b.earned ? "" : "opacity-40 grayscale"}`}
        />
      )}
      <p className={`font-semibold ${b.earned ? "text-moss" : "text-ink/40"}`}>{b.earned ? earnedLabel : lockedLabel}</p>
      <p className={`mt-0.5 ${b.earned ? "text-ink/70" : "text-ink/40"}`}>{b.name}</p>
    </div>
  );
}

type Skill = { competency: string; current: number; required: number; status: string };
type Rec = { course_id: string; title: string; reason: string };
type Dash = {
  profile: { name: string; role: string };
  hours_done: number; hours_goal: number;
  points: number; level_num: number; level_name: string; streak: number; rank_label: string;
  continue: { course_id: string; title: string; percent: number }[];
  due: { title: string; due: string }[];
  certs: { name: string; days: number }[];
  skill: Skill[];
  recommendations: Rec[];
  path: { title: string; done: number; total: number } | null;
  badges: { name: string; icon: string; earned: boolean }[];
};

function num(n: number) {
  return n.toString().replace(".", ",");
}

function Ring({ done, goal, label, size = 116 }: { done: number; goal: number; label: string; size?: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((100 * done) / goal)) : 0;
  const sw = 10;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0e9df" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2e9e45" strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-xl font-semibold leading-none">{num(done)}</p>
        <p className="mt-0.5 text-[11px] text-ink-soft">/ {goal} {label}</p>
      </div>
    </div>
  );
}

function Pips({ current, required }: { current: number; required: number }) {
  return (
    <span className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => {
        const cls =
          i <= current ? "bg-moss border-moss" : i <= required ? "border-moss" : "border-sand";
        const style = i > current && i <= required ? { backgroundColor: "rgba(46,158,69,0.15)" } : {};
        return <span key={i} className={`h-3.5 w-5 rounded border ${cls}`} style={style} />;
      })}
    </span>
  );
}

export default function DashboardPage() {
  const supabase = createClient();
  const { t } = useLang();
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_my_dashboard");
      setD(data as Dash);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) return <div className="p-10 text-ink-soft">{t("dash_loading")}</div>;
  if (!d) return <div className="p-10 text-ink-soft">{t("dash_unavailable")}</div>;

  const isNew = d.points === 0 && d.continue.length === 0;
  const firstName = d.profile.name.split(" ")[0];

  return (
    <div>
      {/* ===== header ===== */}
      <section className="relative overflow-hidden rounded-[26px] border border-line bg-surface shadow-soft">
        <div className="hero-glow" />
        <div className="relative flex flex-wrap items-center gap-4 p-7 sm:p-9">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink font-display text-xl font-semibold text-paper">
            {firstName.slice(0, 1)}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">
              {(isNew ? t("welcome_new") : t("welcome_back")).replace("{name}", firstName)}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">{d.profile.role} · Nabati Group</p>
          </div>
          {!isNew && (
            <div className="flex items-center gap-2">
              <span className="chip">{t("streak_word")} <b className="font-display">{d.streak}</b> {t("word_days")}</span>
              <span className="chip">{t("level_word")} <b className="font-display">{d.level_num}</b> · {d.level_name}</span>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6">{isNew ? <DayOne d={d} /> : <Mature d={d} />}</div>
    </div>
  );
}

function DayOne({ d }: { d: Dash }) {
  const { t } = useLang();
  const first = d.due[0]?.title ?? d.recommendations[0]?.title ?? t("explore_catalog");
  const firstId = d.recommendations[0]?.course_id;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="card p-6">
          <p className="label">{t("start_here")}</p>
          <p className="mt-2 font-display text-xl font-semibold">{t("first_module_ready")}</p>
          <p className="mt-1 text-sm text-ink-soft">{t("picked_by_ai").replace("{role}", d.profile.role)}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand/60 p-4">
            <div>
              <p className="font-medium">{first}</p>
              <p className="label mt-0.5">{t("required_due").replace("{due}", d.due[0]?.due ?? t("due_tba"))}</p>
            </div>
            <Link href={firstId ? `/courses/${firstId}` : "/courses"} className="btn-primary">{t("btn_start")}</Link>
          </div>
        </div>

        <div className="card p-6">
          <p className="font-display text-lg font-semibold">{t("ai_plan")}</p>
          <p className="mt-1 mb-3 text-sm text-ink-soft">
            {t("ai_plan_sub").replace("{role}", d.profile.role).replace("{comp}", d.skill[0]?.competency ?? t("comp_default"))}
          </p>
          {d.recommendations.length === 0 && <p className="text-sm text-ink-soft">{t("no_recs")}</p>}
          {d.recommendations.map((r, i) => (
            <div key={r.course_id} className={`flex items-start gap-3 py-3 ${i ? "border-t border-line" : ""}`}>
              <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-sand text-xs font-semibold">{i + 1}</span>
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-[13px] text-ink-soft">{r.reason}</p>
              </div>
            </div>
          ))}
        </div>

        <SkillCard d={d} subtitle={t("skill_sub_new")} />
      </div>

      <aside className="space-y-6">
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="label self-start">{t("goal_year")}</p>
          <Ring done={d.hours_done} goal={d.hours_goal} label={t("word_hours")} />
          <p className="text-sm text-ink-soft">{t("start_first_hours")}</p>
        </div>
        <div className="card p-5">
          <p className="font-display text-base font-semibold">{t("first_steps")}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li className="flex items-center gap-2"><span className="text-ember">○</span> {t("step_badge")}</li>
            <li className="flex items-center gap-2"><span className="text-ember">○</span> {t("step_streak")}</li>
            <li className="flex items-center gap-2"><span className="text-ember">○</span> {t("step_goal").replace("{goal}", String(d.hours_goal))}</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Mature({ d }: { d: Dash }) {
  const { t } = useLang();
  const cont = d.continue[0];
  const featured = d.recommendations[0];
  const rest = d.recommendations.slice(1);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* ===== kolom utama ===== */}
      <div className="space-y-6">
        {cont ? (
          <div className="card p-6">
            <p className="label">{t("continue_last")}</p>
            <p className="mt-2 font-display text-xl font-semibold">{cont.title}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand" style={{ minWidth: 140 }}>
                <div className="h-full rounded-full bg-moss" style={{ width: `${cont.percent}%` }} />
              </div>
              <span className="text-sm text-ink-soft whitespace-nowrap">{t("pct_done").replace("{p}", String(cont.percent))}</span>
              <Link href={`/courses/${cont.course_id}`} className="btn-primary">{t("btn_continue")}</Link>
            </div>
          </div>
        ) : (
          <div className="card p-6">
            <p className="font-display text-lg font-semibold">{t("ready_again")}</p>
            <Link href="/courses" className="btn-primary mt-3 inline-flex">{t("explore_catalog")}</Link>
          </div>
        )}

        {d.recommendations.length > 0 && (
          <div className="card p-6">
            <p className="font-display text-lg font-semibold">{t("recommended")}</p>
            <p className="mt-1 mb-4 text-sm text-ink-soft">{t("close_gap")}</p>
            {featured && (
              <div className="rounded-2xl border-2 border-moss/40 bg-moss/[0.04] p-4">
                <span className="badge bg-moss/10 text-moss">{t("most_relevant")}</span>
                <p className="mt-2 font-medium">{featured.title}</p>
                <p className="text-[13px] text-ink-soft">{featured.reason}</p>
                <Link href={`/courses/${featured.course_id}`} className="btn-primary mt-3 inline-flex">{t("btn_start")}</Link>
              </div>
            )}
            {rest.map((r) => (
              <Link key={r.course_id} href={`/courses/${r.course_id}`}
                className="mt-1 flex items-center justify-between gap-3 border-t border-line py-3 transition hover:px-2">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-[13px] text-ink-soft">{r.reason}</p>
                </div>
                <span className="text-ink/30">&rarr;</span>
              </Link>
            ))}
          </div>
        )}

        <SkillCard d={d} subtitle={t("toward_standard").replace("{role}", d.profile.role)} />

        {d.path && d.path.total > 0 && (
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <p className="font-display text-base font-semibold">{d.path.title}</p>
              <span className="text-sm text-ink-soft">{t("x_of_y_modules").replace("{done}", String(d.path.done)).replace("{total}", String(d.path.total))}</span>
            </div>
            <div className="mt-3 prog"><i style={{ width: `${Math.round((100 * d.path.done) / d.path.total)}%` }} /></div>
          </div>
        )}
      </div>

      {/* ===== rail kanan ===== */}
      <aside className="space-y-6">
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="label self-start">{t("study_hours")}</p>
          <Ring done={d.hours_done} goal={d.hours_goal} label={t("word_hours")} />
          <div className="flex w-full justify-around pt-1 text-center">
            <div>
              <p className="font-display text-lg font-semibold">{d.streak}</p>
              <p className="text-[11px] text-ink-soft">{t("days_streak")}</p>
            </div>
            <div>
              <p className="font-display text-lg font-semibold">{d.points}</p>
              <p className="text-[11px] text-ink-soft">{t("points_word")}</p>
            </div>
            <div>
              <p className="font-display text-lg font-semibold">{d.rank_label}</p>
              <p className="text-[11px] text-ink-soft">{t("rank_word")}</p>
            </div>
          </div>
        </div>

        {(d.due.length > 0 || d.certs.length > 0) && (
          <div className="card p-5">
            <p className="font-display text-base font-semibold">{t("due_h")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {d.due.map((x, i) => (
                <span key={i} className="badge bg-ember/10 text-emberdark">{x.title} · {x.due}</span>
              ))}
              {d.certs.map((c, i) => (
                <span key={i} className="badge bg-amber-100 text-amber-800">{c.name} · {t("days_left").replace("{n}", String(c.days))}</span>
              ))}
            </div>
          </div>
        )}

        <div className="card p-5">
          <p className="font-display text-base font-semibold">{t("certs_badges")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {d.badges.map((b) => (
              <BadgeCard key={b.name} b={b} earnedLabel={t("earned")} lockedLabel={t("locked")} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function SkillCard({ d, subtitle }: { d: Dash; subtitle: string }) {
  const { t } = useLang();
  const achieved = d.skill.filter((s) => s.current >= s.required).length;
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-lg font-semibold">{d.points === 0 ? t("skill_target_title") : t("skill_journey_title")}</p>
        {d.points > 0 && <span className="text-sm text-ink-soft">{t("x_of_y_achieved").replace("{done}", String(achieved)).replace("{total}", String(d.skill.length))}</span>}
      </div>
      <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
      {d.skill.map((s) => (
        <div key={s.competency} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-line py-3">
          <span className="text-sm">{s.competency}</span>
          <Pips current={s.current} required={s.required} />
          <span className={`badge ${s.current >= s.required ? "bg-moss/10 text-moss" : "bg-sand text-ink/60"}`}>
            {s.current >= s.required ? t("achieved_word") : d.points === 0 ? t("target_lvl").replace("{n}", String(s.required)) : s.status}
          </span>
        </div>
      ))}
    </div>
  );
}
