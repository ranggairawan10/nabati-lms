-- ============================================================
-- 12_pretest_posttest.sql  (Kirkpatrick Level 2)
-- Menambah konsep Pre-Test dan Post-Test pada kursus.
--   - Pre-Test  : kuis di AWAL, mencakup seluruh materi. Merangkap "Tes Lewati"
--                 (lulus >= passing membuka semua sesi + tandai 'tested').
--   - Post-Test : kuis di AKHIR, cakupan setara, untuk mengukur hasil belajar.
--   - Gain (L2) : skor post - skor pre per peserta per kursus.
-- Jalankan SETELAH 01_schema.sql, 02_seed.sql, 05_dashboard.sql, 11_jalur_cepat_teruji.sql.
-- Idempoten.
-- ============================================================
set check_function_bodies = off;

-- 1) Penanda jenis kuis. 'quiz' = kuis sesi biasa (default).
alter table public.assessments
  add column if not exists kind text not null default 'quiz'
  check (kind in ('quiz','pretest','posttest'));

-- 2) Tandai kuis post-test agar muncul di akhir kursus (opsional dipakai UI).
alter table public.courses
  add column if not exists posttest_assessment_id uuid;

-- 3) Ringkasan hasil belajar (Kirkpatrick L2): skor pre, post, dan selisihnya.
--    Mengambil percobaan TERBAIK pada masing-masing pre & post per peserta per kursus.
create or replace function public.course_l2_gain(p_course uuid)
returns table (
  profile_id uuid,
  full_name  text,
  pre_score  int,
  post_score int,
  gain       int
)
language sql stable security definer set search_path = public as $$
  with pre as (
    select a.id from public.assessments a where a.course_id = p_course and a.kind='pretest' limit 1
  ),
  post as (
    select a.id from public.assessments a where a.course_id = p_course and a.kind='posttest' limit 1
  ),
  pre_best as (
    select profile_id, max(score) s from public.assessment_attempts
    where assessment_id = (select id from pre) group by profile_id
  ),
  post_best as (
    select profile_id, max(score) s from public.assessment_attempts
    where assessment_id = (select id from post) group by profile_id
  ),
  who as (
    select profile_id from pre_best
    union
    select profile_id from post_best
  )
  select w.profile_id, p.full_name,
         pb.s::int as pre_score, ob.s::int as post_score,
         (coalesce(ob.s,0) - coalesce(pb.s,0))::int as gain
  from who w
  join public.profiles p on p.id = w.profile_id
  left join pre_best  pb on pb.profile_id = w.profile_id
  left join post_best ob on ob.profile_id = w.profile_id
  order by gain desc nulls last;
$$;
grant execute on function public.course_l2_gain(uuid) to authenticated;
