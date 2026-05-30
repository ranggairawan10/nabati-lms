"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Q = { id: string; type: string; prompt: string; options: string[]; points: number };
type Result = { score: number; passed: boolean; attempt: number };

export default function Quiz({
  assessmentId,
  onComplete,
}: {
  assessmentId: string;
  onComplete?: () => void;
}) {
  const supabase = createClient();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_quiz", { p_assessment: assessmentId });
      setQuestions((data as Q[]) ?? []);
      setLoading(false);
    })();
  }, [supabase, assessmentId]);

  async function submit() {
    const { data, error } = await supabase.rpc("submit_quiz", {
      p_assessment: assessmentId,
      p_responses: answers,
    });
    if (!error && data) {
      setResult(data as Result);
      onComplete?.();
    }
  }

  if (loading) return <p className="text-ink/50">Memuat soal...</p>;

  if (result) {
    return (
      <div className="card p-8 text-center">
        <div className="label">Hasil</div>
        <div className={`mt-2 font-display text-6xl ${result.passed ? "text-moss" : "text-emberdark"}`}>
          {result.score}
        </div>
        <p className="mt-2 text-ink/60">
          {result.passed ? "Selamat, Anda lulus kuis ini." : "Belum lulus. Coba pelajari lagi materinya."}
        </p>
        <button className="btn-ghost mt-6" onClick={() => { setResult(null); setAnswers({}); }}>
          Ulangi kuis
        </button>
      </div>
    );
  }

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="card p-6">
          <p className="font-medium">
            <span className="text-ember">{i + 1}.</span> {q.prompt}
          </p>
          <div className="mt-4 space-y-2">
            {q.options.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  answers[q.id] === opt ? "border-ember bg-ember/5" : "border-sand hover:bg-sand/40"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === opt}
                  onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="btn-primary" onClick={submit} disabled={!allAnswered}>
        Kirim jawaban
      </button>
    </div>
  );
}
