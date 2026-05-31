-- ============================================================
-- DASHBOARD KARYAWAN: jam belajar + target, gamifikasi, gap skill, rekomendasi HC AI
-- Jalankan SETELAH 01-04.
-- ============================================================
set check_function_bodies = off;

-- 1) Target jam belajar tahunan
alter table public.profiles add column if not exists annual_hours_goal int not null default 50;

-- 2) Katalog badge
create table if not exists public.badges (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code            text not null,
  name            text not null,
  icon            text,
  rule_code       text not null,   -- first_step | perfect | streak | hours | leadership
  threshold       int,
  unique (organization_id, code)
);
alter table public.badges enable row level security;
drop policy if exists badges_select on public.badges;
create policy badges_select on public.badges for select to authenticated
  using (organization_id is null or organization_id = public.lms_org_id());

insert into public.badges (organization_id, code, name, icon, rule_code, threshold) values
 ('00000000-0000-0000-0000-0000000000a1','first_step','Langkah Pertama','ti-flag','first_step',1),
 ('00000000-0000-0000-0000-0000000000a1','perfect','Skor Sempurna','ti-star','perfect',100),
 ('00000000-0000-0000-0000-0000000000a1','streak7','Streak 7 Hari','ti-flame','streak',7),
 ('00000000-0000-0000-0000-0000000000a1','hours50','Pembelajar 50 Jam','ti-clock','hours',50),
 ('00000000-0000-0000-0000-0000000000a1','leader','Emerging Leader','ti-trophy','leadership',1)
on conflict do nothing;

-- 3) Saat kursus selesai, naikkan level kompetensi karyawan otomatis
create or replace function public.apply_course_competencies()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' then
    insert into public.user_competencies (organization_id, profile_id, competency_id, current_level)
    select cc.organization_id, new.profile_id, cc.competency_id, cc.target_level
    from public.course_competencies cc
    where cc.course_id = new.course_id and cc.target_level is not null
    on conflict (profile_id, competency_id)
    do update set current_level = greatest(public.user_competencies.current_level, excluded.current_level),
                  updated_at = now();
  end if;
  return new;
end; $$;
drop trigger if exists trg_apply_comp on public.enrollments;
create trigger trg_apply_comp after insert or update of status on public.enrollments
  for each row execute function public.apply_course_competencies();

-- 4) Durasi contoh untuk pelajaran kursus OD (agar jam belajar bermakna)
update public.lessons l set duration_seconds = case l.content_type
  when 'video' then 600 when 'pdf' then 900 when 'quiz' then 300 else 300 end
from public.modules m
where m.id = l.module_id and m.course_id = '1d000000-0000-0000-0000-000000000001'
  and (l.duration_seconds is null or l.duration_seconds = 0);

-- 5) RPC dashboard: satu panggilan, seluruh data learner dihitung di server
create or replace function public.get_my_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  org uuid; v_name text; v_goal int; v_jobrole uuid; v_rolename text;
  completed_lessons int; passed_asmt int; perfect boolean;
  hours numeric; pts int; lvl_num int; lvl_name text; streak int := 0; i int;
  rnk int; total_learners int; rank_label text;
  j_continue jsonb; j_due jsonb; j_certs jsonb; j_skill jsonb; j_recs jsonb; j_path jsonb; j_badges jsonb;
begin
  select organization_id, full_name, annual_hours_goal, job_role_id
    into org, v_name, v_goal, v_jobrole from public.profiles where id = me;
  select name into v_rolename from public.job_roles where id = v_jobrole;

  select count(*) into completed_lessons from public.lesson_progress where profile_id = me and status in ('completed','tested');
  select count(distinct assessment_id) into passed_asmt from public.assessment_attempts where profile_id = me and passed;
  select exists(select 1 from public.assessment_attempts where profile_id = me and coalesce(score,0) >= 100) into perfect;
  select coalesce(sum(l.duration_seconds),0)/3600.0 into hours
    from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
    where lp.profile_id = me and lp.status = 'completed';

  pts := completed_lessons*10 + passed_asmt*50;
  if    pts >= 5000 then lvl_num:=5; lvl_name:='Master';
  elsif pts >= 2000 then lvl_num:=4; lvl_name:='Expert';
  elsif pts >= 800  then lvl_num:=3; lvl_name:='Advanced';
  elsif pts >= 200  then lvl_num:=2; lvl_name:='Intermediate';
  else  lvl_num:=1; lvl_name:='Beginner'; end if;

  if exists(select 1 from public.learning_events where profile_id=me and created_at::date = current_date) then i:=0;
  elsif exists(select 1 from public.learning_events where profile_id=me and created_at::date = current_date-1) then i:=1;
  else i:=-1; end if;
  if i >= 0 then
    loop
      exit when not exists(select 1 from public.learning_events where profile_id=me and created_at::date = current_date - i);
      streak := streak + 1; i := i + 1;
    end loop;
  end if;

  select count(*)+1 into rnk from (
    select profile_id, count(*) c from public.lesson_progress
    where status in ('completed','tested') and organization_id=org group by profile_id) t where t.c > completed_lessons;
  select count(*) into total_learners from public.profiles where organization_id = org;
  rank_label := '#'||rnk||' dari '||greatest(total_learners,1);

  j_continue := coalesce((
    select jsonb_agg(jsonb_build_object('course_id',x.course_id,'title',c.title,
             'percent', round(100.0*x.done/nullif(x.total,0))::int))
    from (
      select e.course_id,
        (select count(*) from public.lessons l join public.modules m on m.id=l.module_id where m.course_id=e.course_id) total,
        (select count(*) from public.lesson_progress lp join public.lessons l on l.id=lp.lesson_id
           join public.modules m on m.id=l.module_id
           where m.course_id=e.course_id and lp.profile_id=me and lp.status in ('completed','tested')) done
      from public.enrollments e where e.profile_id=me and e.status <> 'completed'
    ) x join public.courses c on c.id=x.course_id
    where x.done > 0 and x.done < coalesce(x.total,0)
  ), '[]'::jsonb);

  j_due := coalesce((
    select jsonb_agg(jsonb_build_object('title',c.title,'due',to_char(e.due_date,'DD Mon')) order by e.due_date)
    from public.enrollments e join public.courses c on c.id=e.course_id
    where e.profile_id=me and e.status <> 'completed' and e.due_date is not null
  ), '[]'::jsonb);

  j_certs := coalesce((
    select jsonb_agg(jsonb_build_object('name',cf.name,'days',(ec.expires_at::date - current_date)))
    from public.earned_certifications ec join public.certifications cf on cf.id=ec.certification_id
    where ec.profile_id=me and ec.expires_at is not null and ec.expires_at::date - current_date <= 60
  ), '[]'::jsonb);

  j_skill := coalesce((
    select jsonb_agg(jsonb_build_object(
      'competency',comp.name,'current',coalesce(uc.current_level,0),'required',rc.required_level,
      'status', case when coalesce(uc.current_level,0) >= rc.required_level then 'Tercapai'
                     else (rc.required_level - coalesce(uc.current_level,0))||' level lagi' end)
      order by (rc.required_level - coalesce(uc.current_level,0)) desc)
    from public.role_competencies rc join public.competencies comp on comp.id=rc.competency_id
    left join public.user_competencies uc on uc.competency_id=rc.competency_id and uc.profile_id=me
    where rc.job_role_id = v_jobrole
  ), '[]'::jsonb);

  j_recs := coalesce((
    select jsonb_agg(jsonb_build_object('course_id',course_id,'title',title,'reason',reason))
    from (
      select course_id, title, reason, gap from (
        select distinct on (c.id) c.id course_id, c.title title,
               'Menutup '||comp.name||' ke L'||cc.target_level reason, g.gap gap
        from (
          select rc.competency_id, (rc.required_level - coalesce(uc.current_level,0)) gap
          from public.role_competencies rc
          left join public.user_competencies uc on uc.competency_id=rc.competency_id and uc.profile_id=me
          where rc.job_role_id=v_jobrole and (rc.required_level - coalesce(uc.current_level,0)) > 0
        ) g
        join public.course_competencies cc on cc.competency_id=g.competency_id
        join public.competencies comp on comp.id=g.competency_id
        join public.courses c on c.id=cc.course_id and c.status='published'
        where not exists(select 1 from public.enrollments e where e.profile_id=me and e.course_id=c.id and e.status='completed')
        order by c.id, g.gap desc
      ) dd order by gap desc limit 5
    ) ddd
  ), '[]'::jsonb);

  select to_jsonb(p) into j_path from (
    select lp.title,
      (select count(*) from public.path_items pi where pi.learning_path_id=lp.id) total,
      (select count(*) from public.path_items pi join public.enrollments e
         on e.course_id=pi.course_id and e.profile_id=me and e.status='completed'
       where pi.learning_path_id=lp.id) done
    from public.learning_paths lp where lp.organization_id=org order by lp.created_at limit 1
  ) p;

  j_badges := coalesce((
    select jsonb_agg(jsonb_build_object('name',b.name,'icon',b.icon,'earned',
      case b.rule_code
        when 'first_step' then completed_lessons >= 1
        when 'perfect' then perfect
        when 'streak' then streak >= coalesce(b.threshold,7)
        when 'hours' then hours >= coalesce(b.threshold,50)
        when 'leadership' then exists(
           select 1 from public.enrollments e
           join public.course_competencies cc on cc.course_id=e.course_id
           join public.competencies cp on cp.id=cc.competency_id
           where e.profile_id=me and e.status='completed' and cp.comp_group='leadership')
        else false end))
    from public.badges b where b.organization_id=org
  ), '[]'::jsonb);

  return jsonb_build_object(
    'profile', jsonb_build_object('name', coalesce(v_name,'Pelajar'), 'role', coalesce(v_rolename,'Karyawan')),
    'hours_done', round(hours,1), 'hours_goal', coalesce(v_goal,50),
    'points', pts, 'level_num', lvl_num, 'level_name', lvl_name, 'streak', streak, 'rank_label', rank_label,
    'continue', j_continue, 'due', j_due, 'certs', j_certs, 'skill', j_skill,
    'recommendations', j_recs, 'path', j_path, 'badges', j_badges
  );
end; $$;

grant execute on function public.get_my_dashboard() to authenticated;
