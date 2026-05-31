// Memetakan setiap kursus ke visual: gradien, ikon topik, dan path thumbnail di Supabase Storage.
// Thumbnail dibaca dari folder publik proyek pada path '/assets/thumbs/<slug>' (ekstensi jpg/png/webp dideteksi otomatis).
// Jika file belum ada, komponen otomatis memakai gradien + ikon sebagai fallback,
// jadi tampilan tetap bagus tanpa aset.

export const TOPIC = {
  ember: "linear-gradient(135deg,#e2231a,#b81c16)",
  moss: "linear-gradient(135deg,#2e9e45,#13734f)",
  amber: "linear-gradient(135deg,#e8920c,#c2410c)",
  indigo: "linear-gradient(135deg,#3b5bdb,#22318f)",
  violet: "linear-gradient(135deg,#7a4ddb,#b5179e)",
  ink: "linear-gradient(135deg,#191613,#3a322a)",
} as const;

export type Glyph = "org" | "grid" | "star" | "bars" | "people" | "book";
export type Visual = { gradient: string; glyph: Glyph; thumb: string };

// Pemetaan kursus yang sudah dikenal (ID dari seed Organization Design)
const MAP: Record<string, Visual> = {
  "1d000000-0000-0000-0000-000000000001": { gradient: TOPIC.ember, glyph: "org", thumb: "/assets/thumbs/od-efisiensi" },
  "1d000000-0000-0000-0000-000000000002": { gradient: TOPIC.moss, glyph: "grid", thumb: "/assets/thumbs/model-operasi" },
  "1d000000-0000-0000-0000-000000000003": { gradient: TOPIC.amber, glyph: "star", thumb: "/assets/thumbs/star-model" },
  "1d000000-0000-0000-0000-000000000004": { gradient: TOPIC.indigo, glyph: "bars", thumb: "/assets/thumbs/beban-kerja" },
  "1d000000-0000-0000-0000-000000000005": { gradient: TOPIC.violet, glyph: "people", thumb: "/assets/thumbs/manusia-ai" },
};

const POOL = [TOPIC.ember, TOPIC.moss, TOPIC.amber, TOPIC.indigo, TOPIC.violet];
const GLYPHS: Glyph[] = ["book", "grid", "star", "bars", "people"];

// Thumbnail kursus Produksi dipetakan dari KATA KUNCI peran pada judul, agar tetap cocok
// meski awalan "Kursus N -" dihapus. Urutan pengecekan penting: "plant manager" & "deputy"
// dicek sebelum kata yang lebih umum.
const PRODUKSI_KEYS: { test: RegExp; v: Visual }[] = [
  { test: /deputy|dvp|manufacturing/i,        v: { gradient: TOPIC.violet, glyph: "book",   thumb: "/assets/thumbs/produksi-dvp" } },
  { test: /plant\s*manager/i,                 v: { gradient: TOPIC.ink,    glyph: "org",    thumb: "/assets/thumbs/produksi-plant" } },
  { test: /supervisor/i,                      v: { gradient: TOPIC.amber,  glyph: "bars",   thumb: "/assets/thumbs/produksi-spv" } },
  { test: /foreman/i,                         v: { gradient: TOPIC.indigo, glyph: "people", thumb: "/assets/thumbs/produksi-foreman" } },
  { test: /manager/i,                         v: { gradient: TOPIC.ember,  glyph: "star",   thumb: "/assets/thumbs/produksi-mgr" } },
  { test: /staff|administration/i,            v: { gradient: TOPIC.moss,   glyph: "grid",   thumb: "/assets/thumbs/produksi-staff" } },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function courseVisual(c: { id: string; title: string }): Visual {
  if (MAP[c.id]) return MAP[c.id];
  // Kursus Produksi: cocokkan kata kunci peran pada judul -> gambar jenjang yang tepat.
  const title = c.title || "";
  for (const k of PRODUKSI_KEYS) {
    if (k.test.test(title)) return k.v;
  }
  const h = hash(title || c.id);
  // slug sederhana untuk path thumbnail opsional di Storage
  const slug = (title || "kursus").toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return { gradient: POOL[h % POOL.length], glyph: GLYPHS[h % GLYPHS.length], thumb: `/assets/thumbs/${slug}` };
}
