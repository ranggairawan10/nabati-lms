"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginPhoto() {
  const [hasImg, setHasImg] = useState(true);
  if (!hasImg) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/spot/login-art.jpg"
        alt=""
        onError={() => setHasImg(false)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/30" />
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMsg(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) setMsg(error.message);
      else {
        setMsg("Akun dibuat. Jika konfirmasi email aktif, cek inbox dulu. Lalu masuk.");
        setMode("signin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else router.push("/courses/dashboard");
    }
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <LoginPhoto />
        {/* atmosfer murni CSS: kilau lembut + grid titik tipis (tampil bila tanpa foto) */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -left-20 top-1/4 h-[28rem] w-[28rem] rounded-full opacity-60"
            style={{ background: "radial-gradient(circle, rgba(226,35,26,.22), transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 right-0 h-80 w-80 rounded-full opacity-50"
            style={{ background: "radial-gradient(circle, rgba(232,146,12,.16), transparent 70%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.5]"
            style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          />
        </div>

        <div className="relative label text-paper/55">ONE GLOBAL HCMS</div>

        <div className="relative">
          <h1 className="font-display text-6xl font-semibold leading-[1.02] tracking-tight">
            Belajar.<br />Bertumbuh.<br />Bersama <span className="text-ember">Nabati</span>.
          </h1>
          <p className="mt-6 max-w-sm text-paper/65">
            Modul pembelajaran terpadu di dalam sistem human capital Anda.
          </p>

          <div className="mt-10 max-w-sm space-y-3 border-t border-white/10 pt-8">
            {[
              "Video bernarasi dan kuis interaktif",
              "Jejak kompetensi yang terukur",
              "Selaras dengan kerangka kompetensi KSNI",
            ].map((line) => (
              <div key={line} className="flex items-center gap-3 text-sm text-paper/70">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-sm text-paper/40">Prototipe LMS</div>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="label mb-2">{mode === "signin" ? "Masuk" : "Daftar"}</div>
          <h2 className="font-display text-3xl">
            {mode === "signin" ? "Selamat datang kembali" : "Buat akun baru"}
          </h2>

          <div className="mt-8 space-y-4">
            {mode === "signup" && (
              <input
                className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
                placeholder="Nama lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <input
              className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-line bg-white px-4 py-3 outline-none transition focus:border-ember focus:ring-2 focus:ring-ember/20"
              placeholder="Kata sandi"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn-primary w-full" onClick={submit} disabled={loading}>
              {loading ? "Memproses..." : mode === "signin" ? "Masuk" : "Daftar"}
            </button>
          </div>

          {msg && <p className="mt-4 text-sm text-emberdark">{msg}</p>}

          <button
            className="mt-6 text-sm text-ink/60 underline underline-offset-4"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </div>
      </section>
    </main>
  );
}
