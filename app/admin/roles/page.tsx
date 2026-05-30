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
          <ul className="mt-4 space-y-1">
            {roles.map((r) => (
              <li key={r.id}>
                <button onClick={() => pick(r)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${active?.id === r.id ? "bg-ink text-white" : "hover:bg-sand"}`}>
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {!active ? (
            <p className="text-ink/50">{t("a_role_pick")}</p>
          ) : (
            <div className="card p-5">
              <div className="font-display text-xl">{active.name}</div>
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
