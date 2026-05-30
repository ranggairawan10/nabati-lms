-- ============================================================
-- ADMIN & TNA: kamus kompetensi, skill matrix peran, klasifikasi modul
-- Jalankan SETELAH 01, 02, 03.
-- Alur teori TNA: Kompetensi -> Analisa Kebutuhan -> Modul.
-- ============================================================
set check_function_bodies = off;

-- 1) Kamus kompetensi: tipe (teknikal/perilaku) + kelompok perilaku + level maks
alter table public.competencies add column if not exists comp_type text;   -- technical | behavioral
alter table public.competencies add column if not exists comp_group text;  -- core | leadership | role (untuk perilaku)
alter table public.competencies add column if not exists max_level int not null default 5;

-- 2) Peran / jabatan
create table if not exists public.job_roles (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  created_at      timestamptz not null default now()
);

-- 3) Skill matrix: kompetensi yang dibutuhkan tiap peran + level target
create table if not exists public.role_competencies (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_role_id     uuid not null references public.job_roles(id) on delete cascade,
  competency_id   uuid not null references public.competencies(id) on delete cascade,
  required_level  int not null check (required_level between 1 and 5),
  primary key (job_role_id, competency_id)
);

-- 4) Kaitkan karyawan ke peran (untuk assign by job & gap analysis)
alter table public.profiles add column if not exists job_role_id uuid references public.job_roles(id) on delete set null;

-- 5) Klasifikasi modul (TNA): wajib / berbasis peran / bebas
alter table public.courses add column if not exists requirement_type text not null default 'elective';
  -- mandatory | role_based | elective

-- 6) Isi organization_id otomatis pada tabel konten (agar form admin cukup kirim field inti)
create or replace function public.set_org_default()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then new.organization_id := public.lms_org_id(); end if;
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['competencies','course_competencies','job_roles','role_competencies',
                           'learning_paths','path_items','courses','modules','lessons',
                           'assessments','questions','video_questions']
  loop
    execute format('drop trigger if exists trg_org on public.%I', t);
    execute format('create trigger trg_org before insert on public.%I
                    for each row execute function public.set_org_default()', t);
  end loop;
end $$;

-- 7) RLS tabel baru
alter table public.job_roles enable row level security;
alter table public.role_competencies enable row level security;

drop policy if exists jobroles_select on public.job_roles;
create policy jobroles_select on public.job_roles for select to authenticated using (organization_id = public.lms_org_id());
drop policy if exists jobroles_manage on public.job_roles;
create policy jobroles_manage on public.job_roles for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

drop policy if exists rolecomp_select on public.role_competencies;
create policy rolecomp_select on public.role_competencies for select to authenticated using (organization_id = public.lms_org_id());
drop policy if exists rolecomp_manage on public.role_competencies;
create policy rolecomp_manage on public.role_competencies for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- ============================================================
-- SEED contoh kamus kompetensi & skill matrix
-- ============================================================
insert into public.competencies (id, organization_id, name, comp_type, comp_group, description) values
 ('7c000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Integritas','behavioral','core','Konsisten antara ucapan dan tindakan.'),
 ('7c000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','Orientasi Pelanggan','behavioral','core','Mengutamakan kebutuhan pelanggan internal dan eksternal.'),
 ('7c000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','Kolaborasi','behavioral','core','Bekerja efektif lintas fungsi.'),
 ('7c000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a1','Berpikir Strategis','behavioral','leadership','Menghubungkan keputusan harian dengan arah jangka panjang.'),
 ('7c000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000a1','Mengembangkan Orang Lain','behavioral','leadership','Membimbing dan menumbuhkan anggota tim.'),
 ('7c000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-0000000000a1','Mengelola Perubahan','behavioral','leadership','Memimpin tim melewati transisi.'),
 ('7c000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-0000000000a1','Pengambilan Keputusan','behavioral','role','Mengambil keputusan tepat waktu berbasis data.'),
 ('7c000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-0000000000a1','Komunikasi Persuasif','behavioral','role','Menyampaikan gagasan secara meyakinkan.'),
 ('7c000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000a1','Desain Organisasi','technical',null,'Merancang struktur, peran, dan proses organisasi.'),
 ('7c000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a1','Analisis Beban Kerja','technical',null,'Mengukur dan menyeimbangkan beban kerja.'),
 ('7c000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000a1','Manajemen Biaya SDM','technical',null,'Mengelola efisiensi biaya tenaga kerja.')
on conflict (id) do nothing;

insert into public.job_roles (id, organization_id, name, description) values
 ('7a000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','HR Business Partner','Mitra strategis HR untuk unit bisnis.'),
 ('7a000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','Manajer Lini Produksi','Memimpin operasional lini produksi.')
on conflict (id) do nothing;

insert into public.role_competencies (organization_id, job_role_id, competency_id, required_level) values
 ('00000000-0000-0000-0000-0000000000a1','7a000000-0000-0000-0000-000000000001','7c000000-0000-0000-0000-000000000009',4),
 ('00000000-0000-0000-0000-0000000000a1','7a000000-0000-0000-0000-000000000001','7c000000-0000-0000-0000-000000000004',3),
 ('00000000-0000-0000-0000-0000000000a1','7a000000-0000-0000-0000-000000000001','7c000000-0000-0000-0000-000000000007',3),
 ('00000000-0000-0000-0000-0000000000a1','7a000000-0000-0000-0000-000000000002','7c000000-0000-0000-0000-000000000006',3),
 ('00000000-0000-0000-0000-0000000000a1','7a000000-0000-0000-0000-000000000002','7c000000-0000-0000-0000-000000000007',4),
 ('00000000-0000-0000-0000-0000000000a1','7a000000-0000-0000-0000-000000000002','7c000000-0000-0000-0000-00000000000b',3)
on conflict do nothing;

-- Kaitkan kursus OD ke kompetensi Desain Organisasi (TNA link) + tandai berbasis peran
insert into public.course_competencies (organization_id, course_id, competency_id, target_level) values
 ('00000000-0000-0000-0000-0000000000a1','1d000000-0000-0000-0000-000000000001','7c000000-0000-0000-0000-000000000009',4)
on conflict do nothing;

update public.courses set requirement_type = 'role_based'
where id = '1d000000-0000-0000-0000-000000000001';
