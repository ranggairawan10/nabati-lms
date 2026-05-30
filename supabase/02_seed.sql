-- ============================================================
-- ONE GLOBAL HCMS - Modul LMS : fungsi inti, trigger, & penilaian kuis
-- (Tanpa data kursus. Kursus dimuat oleh 03_seed_org_design.sql.)
-- Jalankan SETELAH 01_schema.sql, di Supabase SQL Editor.
-- ============================================================
set check_function_bodies = off;

-- ------------------------------------------------------------
-- 1. Buat profil otomatis saat user mendaftar (prototipe: semua masuk org Nabati)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, organization_id, email, full_name, role)
  values (
    new.id,
    '00000000-0000-0000-0000-0000000000a1',
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'learner'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2. Isi otomatis organization_id & profile_id pada data pribadi
--    Supaya klien cukup mengirim field intinya saja.
-- ------------------------------------------------------------
create or replace function public.set_personal_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is null then new.profile_id := auth.uid(); end if;
  if new.organization_id is null then new.organization_id := public.lms_org_id(); end if;
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['enrollments','lesson_progress','assessment_attempts',
                           'learning_events','user_competencies','earned_certifications']
  loop
    execute format('drop trigger if exists trg_defaults on public.%I', t);
    execute format('create trigger trg_defaults before insert on public.%I
                    for each row execute function public.set_personal_defaults()', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3. Ambil soal kuis TANPA kunci jawaban (aman untuk learner)
-- ------------------------------------------------------------
create or replace function public.get_quiz(p_assessment uuid)
returns table (id uuid, type text, prompt text, options jsonb, points int)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.assessments a
                 where a.id = p_assessment and a.organization_id = public.lms_org_id()) then
    raise exception 'tidak diizinkan';
  end if;
  return query
    select q.id, q.type, q.prompt, q.options, q.points
    from public.questions q
    where q.assessment_id = p_assessment
    order by q.position;
end; $$;

-- ------------------------------------------------------------
-- 4. Nilai kuis di server, simpan attempt + event, kembalikan skor
-- ------------------------------------------------------------
create or replace function public.submit_quiz(p_assessment uuid, p_responses jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_total int := 0; v_earned int := 0; v_score int;
  v_pass int; v_passed boolean; v_attempt int; r record;
begin
  if not exists (select 1 from public.assessments a
                 where a.id = p_assessment and a.organization_id = public.lms_org_id()) then
    raise exception 'tidak diizinkan';
  end if;

  select passing_score into v_pass from public.assessments where id = p_assessment;

  for r in select id, correct_answer, points from public.questions where assessment_id = p_assessment loop
    v_total := v_total + r.points;
    if to_jsonb(p_responses ->> r.id::text) = r.correct_answer then
      v_earned := v_earned + r.points;
    end if;
  end loop;

  v_score := case when v_total = 0 then 0 else round(100.0 * v_earned / v_total) end;
  v_passed := v_score >= coalesce(v_pass, 70);

  select coalesce(max(attempt_number), 0) + 1 into v_attempt
  from public.assessment_attempts
  where assessment_id = p_assessment and profile_id = auth.uid();

  insert into public.assessment_attempts
    (organization_id, profile_id, assessment_id, attempt_number, score, passed, responses, submitted_at)
  values
    (public.lms_org_id(), auth.uid(), p_assessment, v_attempt, v_score, v_passed, p_responses, now());

  insert into public.learning_events (organization_id, profile_id, verb, object_type, object_id, context)
  values (public.lms_org_id(), auth.uid(), 'submitted', 'assessment', p_assessment,
          jsonb_build_object('score', v_score, 'passed', v_passed));

  return jsonb_build_object('score', v_score, 'passed', v_passed, 'attempt', v_attempt);
end; $$;

grant execute on function public.get_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;


-- ------------------------------------------------------------
-- 6. Pertanyaan di dalam video: ambil tanpa kunci, periksa di server
-- ------------------------------------------------------------
create or replace function public.get_video_questions(p_lesson uuid)
returns table (id uuid, at_seconds int, type text, prompt text, options jsonb)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select v.id, v.at_seconds, v.type, v.prompt, v.options
    from public.video_questions v
    where v.lesson_id = p_lesson and v.organization_id = public.lms_org_id()
    order by v.at_seconds, v.position;
end; $$;

create or replace function public.check_video_answer(p_question uuid, p_answer text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean; v_org uuid;
begin
  select (correct_answer = to_jsonb(p_answer)), organization_id
    into v_ok, v_org
  from public.video_questions where id = p_question;
  if v_org is null or v_org <> public.lms_org_id() then
    raise exception 'tidak diizinkan';
  end if;
  return coalesce(v_ok, false);
end; $$;

grant execute on function public.get_video_questions(uuid) to authenticated;
grant execute on function public.check_video_answer(uuid, text) to authenticated;
