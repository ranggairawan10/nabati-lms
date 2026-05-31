"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { courseVisual, type Glyph } from "@/lib/assets";

const PATHS: Record<Glyph, React.ReactNode> = {
  org: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="8.5" y="14" width="7" height="7" rx="1.5" /><path d="M6.5 10v2.5h11V10M12 12.5V14" /></>),
  grid: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11M15 4v5" /></>),
  star: (<path d="M12 2l2.4 5.9L21 9l-5 4.2L17.6 21 12 17.3 6.4 21 8 13.2 3 9l6.6-1.1z" />),
  bars: (<><path d="M3 3v18h18" /><rect x="6" y="11" width="3" height="7" /><rect x="11" y="7" width="3" height="11" /><rect x="16" y="13" width="3" height="5" /></>),
  people: (<><circle cx="9" cy="9" r="3" /><path d="M2 20c0-3.3 3.1-5 7-5s7 1.7 7 5" /><circle cx="18" cy="7" r="2.2" /><path d="M16 13c3 .3 5 2 5 5" /></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h12" /></>),
};

export default function CourseThumb({
  course,
  level,
  className = "",
}: {
  course: { id: string; title: string };
  level?: string | null;
  className?: string;
}) {
  const v = courseVisual(course);
  const supabase = createClient();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!v.thumb) return;
      // Coba ambil gambar dari Supabase Storage (bucket course-media).
      const { data, error } = await supabase.storage.from("course-media").createSignedUrl(v.thumb, 3600);
      if (active && !error && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => { active = false; };
  }, [v.thumb, supabase]);

  const showImg = url && !failed;

  return (
    <div className={`thumb ${className}`} style={{ backgroundImage: v.gradient }}>
      <div className="thumb-pat" />
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="thumb-img" onError={() => setFailed(true)} />
      )}
      <svg className="thumb-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {PATHS[v.glyph]}
      </svg>
      {level && <span className="thumb-lvl">{level}</span>}
    </div>
  );
}
