"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n";

type Comp = { id: string; name: string; comp_type: string | null; comp_group: string | null; description: string | null };

const GROUP_KEY: Record<string, string> = { core: "a_grp_core", leadership: "a_grp_leadership", role: "a_grp_role" };

export default function CompetenciesPage() {
  const supabase = createClient();
  const { t } = useLang();
  const [items, setItems] = useState<Comp[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("behavioral");
  const [group, setGroup] = useState("core");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("competencies").select("id, name, comp_type, comp_group, description").order("name");
    setItems((data as Comp[]) ?? []);
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

  const tech = items.filter((i) => i.comp_type === "technical");
  const behav = (g: string) => items.filter((i) => i.comp_type === "behavioral" && i.comp_group === g);

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

      <div className="mt-8 space-y-6">
        <Section title={t("a_comp_technical")} items={tech} />
        {(["core", "leadership", "role"] as const).map((g) => (
          <Section key={g} title={t(GROUP_KEY[g])} items={behav(g)} />
        ))}
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: Comp[] }) {
  const { t } = useLang();
  return (
    <div>
      <div className="label mb-2">{title} <span className="text-ink/30">({items.length})</span></div>
      {items.length === 0 ? (
        <p className="text-sm text-ink/40">{t("a_none")}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((c) => (
            <div key={c.id} className="card p-3">
              <div className="font-medium">{c.name}</div>
              {c.description && <div className="mt-0.5 text-sm text-ink/55">{c.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
