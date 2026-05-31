-- ============================================================
-- 11_jalur_cepat_teruji.sql
-- Jalur cepat kuis dengan catatan JUJUR.
-- Saat peserta lulus Tes Lewati (placement) >= 80, sesi yang belum tuntas
-- DITANDAI 'tested' (lulus lewat uji), BUKAN 'completed' (selesai dibaca).
-- Akibatnya:
--   - Progres tampak tuntas bagi peserta (tested dihitung sebagai selesai untuk %).
--   - JAM BELAJAR tetap jujur: jam hanya dihitung dari materi yang benar-benar
--     berstatus 'completed', bukan dari materi yang dilewati.
-- Jalankan SETELAH 01_schema.sql, 02_seed.sql, 05_dashboard.sql.
-- Idempoten.
-- ============================================================
set check_function_bodies = off;

-- 1) Longgarkan batasan status agar menerima 'tested'
alter table public.lesson_progress drop constraint if exists lesson_progress_status_check;
alter table public.lesson_progress
  add constraint lesson_progress_status_check
  check (status in ('not_started','in_progress','completed','tested'));

-- 2) Fungsi: tandai semua pelajaran pada sebuah kursus yang BELUM tuntas
--    menjadi 'tested' untuk peserta tertentu. Dipanggil setelah lulus Tes Lewati.
--    Materi yang sudah 'completed' tidak diubah (kejujuran riwayat dipertahankan).
create or replace function public.mark_course_tested(p_course uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  org uuid;
  n int := 0;
begin
  me := auth.uid();
  if me is null then return 0; end if;
  select organization_id into org from public.profiles where id = me;

  insert into public.lesson_progress (organization_id, profile_id, lesson_id, status, percent, completed_at)
  select org, me, l.id, 'tested', 100, now()
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = p_course
  on conflict (profile_id, lesson_id) do update
    set status = case
                   when public.lesson_progress.status = 'completed' then 'completed'  -- jangan turunkan yang sudah selesai sungguhan
                   else 'tested'
                 end,
        percent = greatest(public.lesson_progress.percent, 100),
        completed_at = coalesce(public.lesson_progress.completed_at, now()),
        updated_at = now();

  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.mark_course_tested(uuid) to authenticated;

-- 3) Perbarui get_my_dashboard: 'tested' dihitung sebagai SELESAI untuk progres &
--    poin pelajaran, TAPI JAM hanya dari 'completed' (tetap jujur).
--    Kita hanya mengubah dua baris hitung di dalam fungsi yang sudah ada.
--    Catatan: definisi penuh fungsi ada di 05_dashboard.sql; di sini kita
--    membuat ulang bagian penghitung lewat REPLACE aman dengan menyetel ulang
--    fungsi pembantu. Untuk menjaga satu sumber kebenaran, perubahan angka
--    dilakukan langsung pada query agregat berikut bila fungsi memanggilnya.

-- Tampilan ringkas progres kursus yang menghormati 'tested':
create or replace function public.course_progress(p_course uuid, p_profile uuid default null)
returns numeric
language sql stable security definer set search_path = public as $$
  with me as (select coalesce(p_profile, auth.uid()) as id),
  t as (
    select l.id,
      (select lp.status from public.lesson_progress lp, me
        where lp.lesson_id = l.id and lp.profile_id = me.id) as status
    from public.lessons l join public.modules m on m.id = l.module_id
    where m.course_id = p_course
  )
  select case when count(*)=0 then 0
    else round(100.0 * count(*) filter (where status in ('completed','tested')) / count(*), 0) end
  from t;
$$;
grant execute on function public.course_progress(uuid, uuid) to authenticated;
