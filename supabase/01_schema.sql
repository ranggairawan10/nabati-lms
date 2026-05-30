-- ============================================================
-- ONE GLOBAL HCMS - Modul LMS
-- Skema inti (vertical slice untuk prototipe, dirancang agar bisa tumbuh)
-- Target: Supabase (PostgreSQL)
-- Cara pakai: buka Supabase Studio > SQL Editor > tempel seluruh file ini > Run
-- ============================================================

-- ------------------------------------------------------------
-- 0. Ekstensi
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";      -- embedding untuk HC AI (pgvector)

-- Izinkan fungsi merujuk tabel yang dibuat di bawahnya (satu skrip migrasi)
set check_function_bodies = off;

-- ------------------------------------------------------------
-- 1. Fungsi bantu untuk RLS (multi-tenant)
--    SECURITY DEFINER supaya membaca profiles tanpa memicu RLS (anti-rekursi)
-- ------------------------------------------------------------
create or replace function public.lms_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.lms_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.lms_is_author()
returns boolean language sql stable security definer set search_path = public as $$
  select public.lms_role() in ('super_admin','org_admin','instructor')
$$;

create or replace function public.lms_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.lms_role() in ('super_admin','org_admin')
$$;

-- pembaru kolom updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 2. IDENTITAS & ORGANISASI
-- ============================================================

-- organizations: tenant. Satu untuk tiap entitas Nabati, atau tiap pelanggan SaaS nanti.
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  type        text not null default 'nabati_entity'
              check (type in ('nabati_entity','saas_customer')),
  created_at  timestamptz not null default now()
);

-- profiles: identitas learner. id menumpang ke auth.users (pola standar Supabase).
-- employee_id mengacu ke ONE HRMS. Inilah jembatan ke SSO induk nanti.
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  employee_id     text,
  full_name       text,
  email           text,
  role            text not null default 'learner'
                  check (role in ('super_admin','org_admin','instructor','manager','learner')),
  department      text,
  location        text,
  manager_id      uuid references public.profiles(id) on delete set null,
  language        text not null default 'id',
  learning_style  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 3. KONTEN (LCMS)
-- ============================================================

create table if not exists public.courses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  description     text,
  level           text check (level in ('beginner','intermediate','advanced')),
  language        text not null default 'id',
  category        text,
  duration_minutes int,
  status          text not null default 'draft'
                  check (status in ('draft','review','published','archived')),
  visibility      text not null default 'organization'
                  check (visibility in ('public','organization','role_based','private')),
  created_by      uuid references public.profiles(id) on delete set null,
  sequential      boolean not null default false,   -- jika true, bagian harus diselesaikan berurutan
  placement_assessment_id uuid,                      -- kuis "lewati": skor >= passing_score membuka semua bagian
  embedding       vector(1536),   -- untuk pencarian semantik & rekomendasi HC AI
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.modules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id       uuid not null references public.courses(id) on delete cascade,
  title           text not null,
  position        int not null default 0,
  created_at      timestamptz not null default now()
);

-- lessons: unit belajar terkecil. Di sinilah video & PDF contoh menempel.
create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  module_id        uuid not null references public.modules(id) on delete cascade,
  title            text not null,
  content_type     text not null
                   check (content_type in ('video','pdf','quiz','scorm','link','text')),
  storage_path     text,   -- path file di Supabase Storage (video / pdf)
  content_url      text,   -- untuk tipe link / sumber eksternal
  body             text,   -- untuk tipe text
  duration_seconds int,
  position         int not null default 0,
  embedding        vector(1536),
  created_at       timestamptz not null default now()
);

-- ============================================================
-- 4. PENDAFTARAN & KEMAJUAN
-- ============================================================

create table if not exists public.enrollments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  course_id       uuid not null references public.courses(id) on delete cascade,
  method          text not null default 'self'
                  check (method in ('self','manager','auto','hc_ai')),
  status          text not null default 'enrolled'
                  check (status in ('enrolled','in_progress','completed','expired','withdrawn')),
  enrolled_at     timestamptz not null default now(),
  due_date        timestamptz,
  completed_at    timestamptz,
  unique (profile_id, course_id)
);

create table if not exists public.lesson_progress (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  lesson_id        uuid not null references public.lessons(id) on delete cascade,
  status           text not null default 'not_started'
                   check (status in ('not_started','in_progress','completed')),
  percent          int not null default 0 check (percent between 0 and 100),
  last_position_sec int not null default 0,   -- lanjutkan tonton video dari sini
  time_spent_sec   int not null default 0,
  completed_at     timestamptz,
  updated_at       timestamptz not null default now(),
  unique (profile_id, lesson_id)
);

-- ============================================================
-- 5. ASESMEN
-- ============================================================

create table if not exists public.assessments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  course_id         uuid not null references public.courses(id) on delete cascade,
  lesson_id         uuid references public.lessons(id) on delete cascade,  -- opsional, bisa nempel di lesson
  title             text not null,
  passing_score     int not null default 70,
  attempt_limit     int default 3,
  time_limit_minutes int,
  created_at        timestamptz not null default now()
);

create table if not exists public.questions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  type            text not null
                  check (type in ('mcq','true_false','multi_select','short_text')),
  prompt          text not null,
  options         jsonb,   -- daftar pilihan
  correct_answer  jsonb,   -- kunci jawaban
  points          int not null default 1,
  position        int not null default 0
);

create table if not exists public.assessment_attempts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  assessment_id   uuid not null references public.assessments(id) on delete cascade,
  attempt_number  int not null default 1,
  score           int,
  passed          boolean,
  responses       jsonb,   -- jawaban learner (cukup untuk prototipe)
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz
);

-- ------------------------------------------------------------
-- 5b. PERTANYAAN DI DALAM VIDEO (interactive video)
--     Video berhenti di detik tertentu; wajib dijawab benar untuk lanjut.
-- ------------------------------------------------------------
create table if not exists public.video_questions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  at_seconds      int not null,                 -- berhenti di detik ke berapa
  type            text not null check (type in ('mcq','true_false')),
  prompt          text not null,
  options         jsonb,
  correct_answer  jsonb,
  position        int not null default 0
);
create index if not exists idx_videoq_lesson on public.video_questions(lesson_id, at_seconds);
alter table public.video_questions enable row level security;
-- hanya author yang boleh kelola; learner mengakses lewat fungsi server (kunci jawaban aman)
drop policy if exists videoq_manage on public.video_questions;
create policy videoq_manage on public.video_questions for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- ============================================================
-- 6. CATATAN AKTIVITAS (proto-LRS / xAPI)
--    Fondasi semua analitik dan otak perilaku HC AI.
-- ============================================================

create table if not exists public.learning_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  verb            text not null,         -- started, completed, watched, submitted, ...
  object_type     text not null,         -- course, lesson, assessment
  object_id       uuid,
  context         jsonb,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 7. LAPISAN PERLUASAN (dirancang sekarang, diisi nanti)
--    Tidak wajib untuk prototipe, tapi sudah ada tempatnya.
-- ============================================================

create table if not exists public.competencies (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  category        text,
  created_at      timestamptz not null default now()
);

create table if not exists public.course_competencies (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id       uuid not null references public.courses(id) on delete cascade,
  competency_id   uuid not null references public.competencies(id) on delete cascade,
  target_level    int check (target_level between 1 and 5),
  primary key (course_id, competency_id)
);

create table if not exists public.user_competencies (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  competency_id   uuid not null references public.competencies(id) on delete cascade,
  current_level   int check (current_level between 1 and 5),
  updated_at      timestamptz not null default now(),
  unique (profile_id, competency_id)
);

create table if not exists public.learning_paths (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  description     text,
  path_type       text not null default 'linear'
                  check (path_type in ('linear','flexible','adaptive')),
  status          text not null default 'draft'
                  check (status in ('draft','published','archived')),
  created_at      timestamptz not null default now()
);

create table if not exists public.path_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  course_id        uuid not null references public.courses(id) on delete cascade,
  position         int not null default 0,
  is_required      boolean not null default true
);

create table if not exists public.certifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  validity_months int,   -- null = tidak kedaluwarsa
  course_id       uuid references public.courses(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table if not exists public.earned_certifications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete cascade,
  certification_id uuid not null references public.certifications(id) on delete cascade,
  issued_at        timestamptz not null default now(),
  expires_at       timestamptz,
  credential_code  text unique
);

create table if not exists public.compliance_requirements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  country          text,
  target_role      text,   -- siapa yang wajib
  certification_id uuid references public.certifications(id) on delete set null,
  renewal_months   int,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- 8. INDEKS
-- ============================================================
create index if not exists idx_profiles_org        on public.profiles(organization_id);
create index if not exists idx_profiles_manager     on public.profiles(manager_id);
create index if not exists idx_courses_org_status   on public.courses(organization_id, status);
create index if not exists idx_modules_course       on public.modules(course_id);
create index if not exists idx_lessons_module       on public.lessons(module_id);
create index if not exists idx_enrollments_profile  on public.enrollments(profile_id);
create index if not exists idx_enrollments_course   on public.enrollments(course_id);
create index if not exists idx_progress_profile     on public.lesson_progress(profile_id);
create index if not exists idx_progress_lesson      on public.lesson_progress(lesson_id);
create index if not exists idx_attempts_profile     on public.assessment_attempts(profile_id, assessment_id);
create index if not exists idx_events_profile_time  on public.learning_events(profile_id, created_at);
create index if not exists idx_events_org_time      on public.learning_events(organization_id, created_at);

-- Indeks vektor untuk HC AI (HNSW, jalan tanpa tuning). Opsional untuk prototipe.
create index if not exists idx_courses_embedding
  on public.courses using hnsw (embedding vector_cosine_ops);
create index if not exists idx_lessons_embedding
  on public.lessons using hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 9. TRIGGER updated_at
-- ============================================================
drop trigger if exists trg_courses_updated on public.courses;
create trigger trg_courses_updated before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_progress_updated on public.lesson_progress;
create trigger trg_progress_updated before update on public.lesson_progress
  for each row execute function public.set_updated_at();

drop trigger if exists trg_usercomp_updated on public.user_competencies;
create trigger trg_usercomp_updated before update on public.user_competencies
  for each row execute function public.set_updated_at();

-- ============================================================
-- 10. ROW LEVEL SECURITY
--     Pola: semua anggota org boleh BACA; hanya author yang boleh KELOLA konten;
--     data pribadi (progress, attempt, event) hanya milik sendiri + admin.
-- ============================================================

-- aktifkan RLS di semua tabel
alter table public.organizations          enable row level security;
alter table public.profiles               enable row level security;
alter table public.courses                enable row level security;
alter table public.modules                enable row level security;
alter table public.lessons                enable row level security;
alter table public.enrollments            enable row level security;
alter table public.lesson_progress        enable row level security;
alter table public.assessments            enable row level security;
alter table public.questions              enable row level security;
alter table public.assessment_attempts    enable row level security;
alter table public.learning_events        enable row level security;
alter table public.competencies           enable row level security;
alter table public.course_competencies    enable row level security;
alter table public.user_competencies      enable row level security;
alter table public.learning_paths         enable row level security;
alter table public.path_items             enable row level security;
alter table public.certifications         enable row level security;
alter table public.earned_certifications  enable row level security;
alter table public.compliance_requirements enable row level security;

-- --- organizations ---
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select to authenticated
  using (id = public.lms_org_id());
drop policy if exists org_admin on public.organizations;
create policy org_admin on public.organizations for all to authenticated
  using (id = public.lms_org_id() and public.lms_is_admin())
  with check (id = public.lms_org_id() and public.lms_is_admin());

-- --- profiles ---
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_admin())
  with check (organization_id = public.lms_org_id() and public.lms_is_admin());

-- --- tabel konten: BACA untuk se-org, KELOLA untuk author ---
-- courses
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists courses_manage on public.courses;
create policy courses_manage on public.courses for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- modules
drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists modules_manage on public.modules;
create policy modules_manage on public.modules for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- lessons
drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists lessons_manage on public.lessons;
create policy lessons_manage on public.lessons for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- assessments
drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists assessments_manage on public.assessments;
create policy assessments_manage on public.assessments for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- questions (jawaban benar hanya terlihat author; learner ambil soal lewat fungsi server nanti)
drop policy if exists questions_manage on public.questions;
create policy questions_manage on public.questions for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- competencies + mapping + paths + certifications + compliance: pola konten yang sama
drop policy if exists comp_select on public.competencies;
create policy comp_select on public.competencies for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists comp_manage on public.competencies;
create policy comp_manage on public.competencies for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

drop policy if exists ccomp_select on public.course_competencies;
create policy ccomp_select on public.course_competencies for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists ccomp_manage on public.course_competencies;
create policy ccomp_manage on public.course_competencies for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

drop policy if exists paths_select on public.learning_paths;
create policy paths_select on public.learning_paths for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists paths_manage on public.learning_paths;
create policy paths_manage on public.learning_paths for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

drop policy if exists pitems_select on public.path_items;
create policy pitems_select on public.path_items for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists pitems_manage on public.path_items;
create policy pitems_manage on public.path_items for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

drop policy if exists cert_select on public.certifications;
create policy cert_select on public.certifications for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists cert_manage on public.certifications;
create policy cert_manage on public.certifications for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

drop policy if exists creq_select on public.compliance_requirements;
create policy creq_select on public.compliance_requirements for select to authenticated
  using (organization_id = public.lms_org_id());
drop policy if exists creq_manage on public.compliance_requirements;
create policy creq_manage on public.compliance_requirements for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_admin())
  with check (organization_id = public.lms_org_id() and public.lms_is_admin());

-- --- data pribadi: milik sendiri + admin boleh baca ---
-- enrollments (learner boleh daftar sendiri)
drop policy if exists enroll_own on public.enrollments;
create policy enroll_own on public.enrollments for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and organization_id = public.lms_org_id());
drop policy if exists enroll_staff on public.enrollments;
create policy enroll_staff on public.enrollments for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- lesson_progress
drop policy if exists progress_own on public.lesson_progress;
create policy progress_own on public.lesson_progress for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and organization_id = public.lms_org_id());
drop policy if exists progress_admin_read on public.lesson_progress;
create policy progress_admin_read on public.lesson_progress for select to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author());

-- assessment_attempts
drop policy if exists attempt_own on public.assessment_attempts;
create policy attempt_own on public.assessment_attempts for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and organization_id = public.lms_org_id());
drop policy if exists attempt_admin_read on public.assessment_attempts;
create policy attempt_admin_read on public.assessment_attempts for select to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author());

-- learning_events
drop policy if exists events_own on public.learning_events;
create policy events_own on public.learning_events for insert to authenticated
  with check (profile_id = auth.uid() and organization_id = public.lms_org_id());
drop policy if exists events_read on public.learning_events;
create policy events_read on public.learning_events for select to authenticated
  using (profile_id = auth.uid() or (organization_id = public.lms_org_id() and public.lms_is_author()));

-- user_competencies
drop policy if exists ucomp_own_read on public.user_competencies;
create policy ucomp_own_read on public.user_competencies for select to authenticated
  using (profile_id = auth.uid() or (organization_id = public.lms_org_id() and public.lms_is_author()));
drop policy if exists ucomp_manage on public.user_competencies;
create policy ucomp_manage on public.user_competencies for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- earned_certifications
drop policy if exists ecert_read on public.earned_certifications;
create policy ecert_read on public.earned_certifications for select to authenticated
  using (profile_id = auth.uid() or (organization_id = public.lms_org_id() and public.lms_is_author()));
drop policy if exists ecert_manage on public.earned_certifications;
create policy ecert_manage on public.earned_certifications for all to authenticated
  using (organization_id = public.lms_org_id() and public.lms_is_author())
  with check (organization_id = public.lms_org_id() and public.lms_is_author());

-- ============================================================
-- 11. STORAGE (bucket untuk video & PDF contoh)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('course-media','course-media', false)
on conflict (id) do nothing;

drop policy if exists course_media_read on storage.objects;
create policy course_media_read on storage.objects for select to authenticated
  using (bucket_id = 'course-media');
drop policy if exists course_media_write on storage.objects;
create policy course_media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'course-media' and public.lms_is_author());

-- ============================================================
-- 12. SEED contoh (sesuaikan / hapus untuk produksi)
-- ============================================================
insert into public.organizations (id, name, slug, type)
values ('00000000-0000-0000-0000-0000000000a1','Nabati Group','nabati','nabati_entity')
on conflict (id) do nothing;

-- Catatan: profiles dibuat saat user signup di Supabase Auth.
-- Setelah user pertama dibuat, jadikan dia admin & tautkan ke org:
--   update public.profiles
--     set organization_id = '00000000-0000-0000-0000-0000000000a1',
--         role = 'org_admin'
--     where email = 'email-anda@nabati.co.id';
