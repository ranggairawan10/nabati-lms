"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_my_dashboard");
      setD(data as Dash);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) return <div className="p-10 text-ink/50">Memuat dashboard...</div>;
  if (!d) return <div className="p-10 text-ink/50">Dashboard belum tersedia.</div>;

  const isNew = d.points === 0 && d.continue.length === 0;
  const firstName = d.profile.name.split(" ")[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 pt-2 pb-1">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-sand font-medium">
          {firstName.slice(0, 1)}
        </div>
        <div>
          <p className="font-medium">{isNew ? `Selamat datang, ${firstName}` : `Halo, ${firstName}`}</p>
          <p className="label">{d.profile.role} · Nabati Group</p>
        </div>
      </div>
      {isNew ? <DayOne d={d} /> : <Mature d={d} />}
    </div>
  );
}

function DayOne({ d }: { d: Dash }) {
  const first = d.due[0]?.title ?? d.recommendations[0]?.title ?? "Jelajahi katalog";
  const firstId = d.recommendations[0]?.course_id;
  return (
    <>
      <div className="card p-6">
        <p className="label">Mulai di sini</p>
        <p className="mt-1 font-display text-xl">Modul pertama Anda sudah disiapkan</p>
        <p className="label mt-0.5">Dipilih HC AI sesuai peran {d.profile.role}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand/60 p-3">
          <div>
            <p className="font-medium">{first}</p>
            <p className="label">Wajib · tenggat {d.due[0]?.due ?? "menyusul"}</p>
          </div>
          <Link href={firstId ? `/courses/${firstId}` : "/courses"} className="btn-primary">Mulai</Link>
        </div>
      </div>

      <div className="card p-5">
        <p className="font-medium">Rencana dari HC AI</p>
        <p className="label mt-1 mb-3">
          Sebagai {d.profile.role}, fokus pertama Anda adalah {d.skill[0]?.competency ?? "pengembangan peran"}. Ini langkah pembukanya.
        </p>
        {d.recommendations.length === 0 && <p className="label">Belum ada rekomendasi. Mulai dari modul wajib di atas.</p>}
        {d.recommendations.map((r, i) => (
          <div key={r.course_id} className={`flex items-start gap-3 py-2 ${i ? "border-t border-sand" : ""}`}>
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-sand text-xs font-medium">{i + 1}</span>
            <div>
              <p className="text-sm font-medium">{r.title}</p>
              <p className="label">{r.reason}</p>
            </div>
          </div>
        ))}
      </div>

      <SkillCard d={d} subtitle="Belum ada yang dimulai, inilah targetnya." />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-3 text-sm text-ink/70">Raih badge pertama: Langkah Pertama</div>
        <div className="card p-3 text-sm text-ink/70">Mulai streak hari ini</div>
        <div className="card p-3 text-sm text-ink/70">Target {d.hours_goal} jam tahun ini</div>
      </div>
    </>
  );
}

function Mature({ d }: { d: Dash }) {
  const cont = d.continue[0];
  const featured = d.recommendations[0];
  const rest = d.recommendations.slice(1);
  return (
    <>
      {cont ? (
        <div className="card p-5">
          <p className="label">Lanjutkan dari terakhir</p>
          <p className="mt-1 font-display text-xl">{cont.title}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand" style={{ minWidth: 140 }}>
              <div className="h-full bg-moss" style={{ width: `${cont.percent}%` }} />
            </div>
            <span className="label whitespace-nowrap">{cont.percent}% selesai</span>
            <Link href={`/courses/${cont.course_id}`} className="btn-primary">Lanjutkan</Link>
          </div>
        </div>
      ) : (
        <div className="card p-5">
          <p className="font-medium">Siap belajar lagi?</p>
          <Link href="/courses" className="btn-primary mt-3 inline-flex">Jelajahi katalog</Link>
        </div>
      )}

      {(d.due.length > 0 || d.certs.length > 0) && (
        <div className="card p-5">
          <p className="font-medium">Jatuh tempo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {d.due.map((x, i) => (
              <span key={i} className="badge bg-ember/10 text-emberdark">{x.title} · {x.due}</span>
            ))}
            {d.certs.map((c, i) => (
              <span key={i} className="badge bg-amber-100 text-amber-800">{c.name} · {c.days} hari lagi</span>
            ))}
          </div>
        </div>
      )}

      {d.recommendations.length > 0 && (
        <div className="card p-5">
          <p className="font-medium">Direkomendasikan untuk Anda</p>
          <p className="label mt-1 mb-3">Untuk menutup jarak terbesar Anda</p>
          {featured && (
            <div className="rounded-xl border-2 border-moss/40 p-4">
              <span className="badge bg-moss/10 text-moss">Paling relevan</span>
              <p className="mt-2 font-medium">{featured.title}</p>
              <p className="label">{featured.reason}</p>
              <Link href={`/courses/${featured.course_id}`} className="btn-primary mt-3 inline-flex">Mulai</Link>
            </div>
          )}
          {rest.map((r) => (
            <Link key={r.course_id} href={`/courses/${r.course_id}`}
              className="mt-2 flex items-center justify-between gap-3 border-t border-sand py-3 pt-3">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="label">{r.reason}</p>
              </div>
              <span className="text-ink/30">&rarr;</span>
            </Link>
          ))}
        </div>
      )}

      <SkillCard d={d} subtitle={`Menuju standar ${d.profile.role}`} />

      {d.path && d.path.total > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="font-medium">{d.path.title}</p>
            <span className="label">{d.path.done} dari {d.path.total} modul</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand">
            <div className="h-full bg-moss" style={{ width: `${Math.round((100 * d.path.done) / d.path.total)}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="card p-3 text-sm text-ink/70">Streak <span className="font-medium text-ink">{d.streak} hari</span></div>
        <div className="card p-3 text-sm text-ink/70"><span className="font-medium text-ink">{num(d.hours_done)} / {d.hours_goal}</span> jam</div>
        <div className="card p-3 text-sm text-ink/70">Level {d.level_num} · {d.level_name}</div>
        <div className="card p-3 text-sm text-ink/70">Peringkat {d.rank_label}</div>
      </div>

      <div className="card p-5">
        <p className="font-medium">Sertifikat & badge</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {d.badges.map((b) => (
            <div key={b.name}
              className={`rounded-xl p-3 text-center text-xs ${b.earned ? "bg-moss/10 text-moss" : "bg-sand/70 text-ink/40"}`}>
              <p className="font-medium">{b.earned ? "Diraih" : "Terkunci"}</p>
              <p className="mt-1">{b.name}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SkillCard({ d, subtitle }: { d: Dash; subtitle: string }) {
  const achieved = d.skill.filter((s) => s.current >= s.required).length;
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium">{d.points === 0 ? "Profil skill yang Anda tuju" : "Perjalanan skill Anda"}</p>
        {d.points > 0 && <span className="label">{achieved} dari {d.skill.length} tercapai</span>}
      </div>
      <p className="label mt-1">{subtitle}</p>
      {d.skill.map((s) => (
        <div key={s.competency} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-sand py-3">
          <span className="text-sm">{s.competency}</span>
          <Pips current={s.current} required={s.required} />
          <span className={`badge ${s.current >= s.required ? "bg-moss/10 text-moss" : "bg-sand text-ink/60"}`}>
            {s.current >= s.required ? "Tercapai" : d.points === 0 ? `Target L${s.required}` : s.status}
          </span>
        </div>
      ))}
    </div>
  );
}
