"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

type Comp = { id: string; name: string; comp_type: string | null; comp_group: string | null; category: string | null; description: string | null };
type Lvl = { competency_id: string; level: number; descriptor: string | null };

const GROUP_KEY: Record<string, string> = { core: "a_grp_core", leadership: "a_grp_leadership", role: "a_grp_role" };

export default function CompetenciesPage() {
  const supabase = createClient();
  const { t } = useLang();
  const [items, setItems] = useState<Comp[]>([]);
  const [levels, setLevels] = useState<Record<string, Lvl[]>>({});
  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState("behavioral");
  const [group, setGroup] = useState("core");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("competencies")
      .select("id, name, comp_type, comp_group, category, description").order("name");
    setItems((data as Comp[]) ?? []);
    const { data: lv } = await supabase.from("competency_levels").select("competency_id, level, descriptor");
    const map: Record<string, Lvl[]> = {};
    (lv as Lvl[] ?? []).forEach((r) => { (map[r.competency_id] ||= []).push(r); });
    Object.values(map).forEach((a) => a.sort((x, y) => x.level - y.level));
    setLevels(map);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("competencies").insert({
      name, comp_type: type, comp_group: type === "behavioral" ? group : null, description: desc || null,
    });
    setName(""); setDesc("");
    await load();
    setSaving(false);
  }

  // ---- filter + grouping ----
  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    const match = (c: Comp) =>
      !term || [c.name, c.description, c.category].filter(Boolean).join(" ").toLowerCase().includes(term);
    const filtered = items.filter(match);

    const behav: Record<string, Comp[]> = { core: [], leadership: [], role: [] };
    const tech: Record<string, Comp[]> = {};
    for (const c of filtered) {
      if (c.comp_type === "behavioral" && c.comp_group && behav[c.comp_group]) behav[c.comp_group].push(c);
      else {
        const cat = c.category || t("a_tech_other");
        (tech[cat] ||= []).push(c);
      }
    }
    const out: { title: string; items: Comp[] }[] = [];
    (["core", "leadership", "role"] as const).forEach((g) => {
      if (behav[g].length) out.push({ title: t(GROUP_KEY[g]), items: behav[g] });
    });
    Object.keys(tech).sort((a, b) => a.localeCompare(b)).forEach((cat) => {
      out.push({ title: cat, items: tech[cat] });
    });
    return out;
  }, [items, q, t]);

  const shown = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div>
      <div className="label">{t("a_nav_comp")}</div>
      <h1 className="mt-1 font-display text-3xl">{t("a_comp_h")}</h1>
      <p className="mt-2 text-ink/60">{t("a_comp_sub")}</p>

      <div className="mt-6 card p-5">
        <div className="label mb-3">{t("a_comp_add")}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder={t("a_ph_comp_name")} value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="behavioral">{t("a_opt_behavioral")}</option>
            <option value="technical">{t("a_opt_technical")}</option>
          </select>
          {type === "behavioral" && (
            <select className="input" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="core">{t("a_grp_core")}</option>
              <option value="leadership">{t("a_grp_leadership")}</option>
              <option value="role">{t("a_grp_role")}</option>
            </select>
          )}
          <input className="input sm:col-span-2" placeholder={t("a_ph_desc_opt")} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <button className="btn-primary mt-4" onClick={add} disabled={saving}>{t("a_btn_save_comp")}</button>
      </div>

      {/* pencarian */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9088" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
          <input className="flex-1 bg-transparent text-sm outline-none" placeholder={t("a_search_comp")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <span className="text-sm text-ink/50">{shown} {t("a_comp_count")}</span>
      </div>

      <div className="mt-6 space-y-7">
        {sections.length === 0 ? (
          <p className="text-sm text-ink/40">{t("a_no_match")}</p>
        ) : sections.map((s) => (
          <div key={s.title}>
            <div className="label mb-2">{s.title} <span className="text-ink/30">({s.items.length})</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {s.items.map((c) => <CompCard key={c.id} c={c} levels={levels[c.id] ?? []} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompCard({ c, levels }: { c: Comp; levels: Lvl[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4">
      <div className="font-medium">{c.name}</div>
      {c.description && <div className="mt-0.5 text-sm text-ink/55">{c.description}</div>}
      <button onClick={() => setOpen((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ember">
        {open ? t("a_hide_levels") : t("a_view_levels")}
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {levels.length === 0 ? (
            <p className="text-xs text-ink/40">{t("a_no_levels")}</p>
          ) : levels.map((l) => (
            <div key={l.level} className="flex gap-2 text-sm">
              <span className="badge h-fit shrink-0 bg-moss/10 text-moss">L{l.level}</span>
              <span className="text-ink/70">{l.descriptor}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
