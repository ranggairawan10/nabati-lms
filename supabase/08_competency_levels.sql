-- ============================================================
-- ONE GLOBAL HCMS - Modul LMS
-- 08_competency_levels.sql
-- Menyimpan deskripsi perilaku Level 1..5 untuk tiap kompetensi
-- (dari kerangka KSNI). Aman dijalankan setelah 01-05.
-- ============================================================
set check_function_bodies = off;

-- Kolom kategori sudah ada di competencies (category). Pastikan ada.
alter table public.competencies add column if not exists category text;

create table if not exists public.competency_levels (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  competency_id   uuid not null references public.competencies(id) on delete cascade,
  level           int  not null check (level between 1 and 5),
  descriptor      text,
  primary key (competency_id, level)
);

-- Isi organization_id otomatis bila kosong (mengikuti pola tabel konten lain)
create or replace function public.lms_fill_org_complevels()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then new.organization_id := public.lms_org_id(); end if;
  return new;
end $$;

drop trigger if exists trg_fill_org_complevels on public.competency_levels;
create trigger trg_fill_org_complevels before insert on public.competency_levels
  for each row execute function public.lms_fill_org_complevels();

alter table public.competency_levels enable row level security;

drop policy if exists complevels_select on public.competency_levels;
create policy complevels_select on public.competency_levels for select to authenticated
  using (organization_id = public.lms_org_id());

drop policy if exists complevels_manage on public.competency_levels;
create policy complevels_manage on public.competency_levels for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());
