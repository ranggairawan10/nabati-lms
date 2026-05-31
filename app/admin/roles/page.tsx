"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

type Role = { id: string; name: string; description: string | null };
type Comp = { id: string; name: string };
type RC = { competency_id: string; required_level: number };

export default function RolesPage() {
  const supabase = createClient();
  const { t } = useLang();
  const [roles, setRoles] = useState<Role[]>([]);
  const [comps, setComps] = useState<Comp[]>([]);
  const [active, setActive] = useState<Role | null>(null);
  const [matrix, setMatrix] = useState<RC[]>([]);

  const [rName, setRName] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [selComp, setSelComp] = useState("");
  const [selLevel, setSelLevel] = useState(3);
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const loadRoles = useCallback(async () => {
    const { data } = await supabase.from("job_roles").select("id, name, description").order("name");
    setRoles((data as Role[]) ?? []);
  }, [supabase]);

  const loadMatrix = useCallback(async (roleId: string) => {
    const { data } = await supabase.from("role_competencies").select("competency_id, required_level").eq("job_role_id", roleId);
    setMatrix((data as RC[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      await loadRoles();
      const { data } = await supabase.from("competencies").select("id, name").order("name");
      setComps((data as Comp[]) ?? []);
    })();
  }, [supabase, loadRoles]);

  async function addRole() {
    if (!rName.trim()) return;
    await supabase.from("job_roles").insert({ name: rName, description: rDesc || null });
    setRName(""); setRDesc("");
    await loadRoles();
  }

  async function pick(r: Role) { setActive(r); await loadMatrix(r.id); }

  async function saveRename(id: string) {
    const name = editingName.trim();
    if (!name) return;
    await supabase.from("job_roles").update({ name }).eq("id", id);
    setEditingId(null);
    setEditingName("");
    await loadRoles();
    if (active?.id === id) setActive((prev) => prev ? { ...prev, name } : prev);
  }

  async function addMatrix() {
    if (!active || !selComp) return;
    await supabase.from("role_competencies").upsert(
      { job_role_id: active.id, competency_id: selComp, required_level: selLevel },
      { onConflict: "job_role_id,competency_id" }
    );
    setSelComp("");
    await loadMatrix(active.id);
  }

  const compName = (id: string) => comps.find((c) => c.id === id)?.name ?? id;

  return (
    <div>
      <div className="label">{t("a_nav_roles")}</div>
      <h1 className="mt-1 font-display text-3xl">{t("a_roles_h")}</h1>
      <p className="mt-2 text-ink/60">{t("a_roles_sub")}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div>
          <div className="card p-4">
            <div className="label mb-2">{t("a_role_add")}</div>
            <input className="input" placeholder={t("a_ph_role_name")} value={rName} onChange={(e) => setRName(e.target.value)} />
            <input className="input mt-2" placeholder={t("a_ph_desc")} value={rDesc} onChange={(e) => setRDesc(e.target.value)} />
            <button className="btn-primary mt-3 w-full" onClick={addRole}>{t("a_btn_add")}</button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9088" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg>
            <input className="flex-1 bg-transparent text-sm outline-none" placeholder={t("a_search_role")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="mt-2 text-xs text-ink/45">{roles.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())).length} {t("a_role_count")}</div>
          <ul className="mt-2 max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {roles.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())).map((r) => (
              <li key={r.id}>
                {editingId === r.id ? (
                  <div className="flex items-center gap-1 rounded-xl border border-ember px-2 py-1">
                    <input
                      autoFocus
                      className="flex-1 bg-transparent text-sm outline-none"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(r.id);
                        if (e.key === "Escape") { setEditingId(null); setEditingName(""); }
                      }}
                    />
                    <button onClick={() => saveRename(r.id)} className="shrink-0 rounded-lg bg-ember px-2 py-0.5 text-[11px] font-semibold text-white">Simpan</button>
                    <button onClick={() => { setEditingId(null); setEditingName(""); }} className="shrink-0 text-ink/40 hover:text-ink">✕</button>
                  </div>
                ) : (
                  <div className={`group flex items-center rounded-xl transition ${active?.id === r.id ? "bg-ink text-white" : "hover:bg-sand"}`}>
                    <button onClick={() => pick(r)} className="flex-1 px-3 py-2 text-left text-sm">
                      {r.name}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(r.id); setEditingName(r.name); }}
                      className={`mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg opacity-0 transition group-hover:opacity-100 ${active?.id === r.id ? "hover:bg-white/20" : "hover:bg-sand"}`}
                      title="Rename"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                      </svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
            {roles.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())).length === 0 && (
              <li className="px-3 py-2 text-sm text-ink/40">{t("a_no_role_match")}</li>
            )}
          </ul>
        </div>

        <div>
          {!active ? (
            <p className="text-ink/50">{t("a_role_pick")}</p>
          ) : (
            <div className="card p-5">
              {editingId === active.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="input flex-1 font-display text-xl"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(active.id);
                      if (e.key === "Escape") { setEditingId(null); setEditingName(""); }
                    }}
                  />
                  <button onClick={() => saveRename(active.id)} className="btn-primary shrink-0">Simpan</button>
                  <button onClick={() => { setEditingId(null); setEditingName(""); }} className="btn-ghost shrink-0">Batal</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="font-display text-xl flex-1">{active.name}</div>
                  <button
                    onClick={() => { setEditingId(active.id); setEditingName(active.name); }}
                    className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink/60 hover:bg-sand hover:text-ink transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                    </svg>
                    Rename
                  </button>
                </div>
              )}
              <div className="label mt-4 mb-2">{t("a_role_required_comp")}</div>
              {matrix.length === 0 ? (
                <p className="text-sm text-ink/40">{t("a_none_add_below")}</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {matrix.map((m) => (
                      <tr key={m.competency_id} className="border-b border-sand">
                        <td className="py-2">{compName(m.competency_id)}</td>
                        <td className="py-2 text-right">
                          <span className="badge bg-moss/10 text-moss">{t("a_level")} {m.required_level}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <select className="input flex-1" value={selComp} onChange={(e) => setSelComp(e.target.value)}>
                  <option value="">{t("a_ph_pick_comp")}</option>
                  {comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input w-28" value={selLevel} onChange={(e) => setSelLevel(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>{t("a_level")} {l}</option>)}
                </select>
                <button className="btn-primary" onClick={addMatrix}>{t("a_btn_add_it")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
