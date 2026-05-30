"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginArt() {
  const [hasImg, setHasImg] = useState(true);
  if (!hasImg) return <div className="flex-1" />;
  return (
    <div className="relative flex-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/spot/login-art.png"
        alt=""
        onError={() => setHasImg(false)}
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
    </div>
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
      <section className="hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
        <div className="label text-paper/60">ONE GLOBAL HCMS</div>
        <div>
          <h1 className="font-display text-5xl leading-tight">
            Belajar.<br />Bertumbuh.<br />Bersama Nabati.
          </h1>
          <p className="mt-6 max-w-sm text-paper/70">
            Modul pembelajaran terpadu di dalam sistem human capital Anda.
          </p>
        </div>
        <LoginArt />
        <div className="text-sm text-paper/40">Prototipe LMS</div>
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
