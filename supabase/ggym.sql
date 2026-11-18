-- =====================================================================
-- GGym — Supabase schema
-- Chạy 1 lần trong Supabase → SQL Editor. Chạy lại cũng an toàn (idempotent),
-- KHÔNG xoá hay ghi đè dữ liệu đã có.
--
-- Thiết kế: app offline-first, mỗi tài khoản 1 dòng trong ggym_docs
-- (toàn bộ dữ liệu dạng jsonb + số phiên bản rev để chống ghi đè lẫn nhau).
-- Các view ggym_workouts / ggym_sets / ggym_body bung jsonb ra bảng phẳng
-- để query SQL hoặc nối Power BI.
-- =====================================================================

create table if not exists public.ggym_docs (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  doc        jsonb       not null,
  rev        bigint      not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.ggym_docs enable row level security;

drop policy if exists ggym_docs_select on public.ggym_docs;
drop policy if exists ggym_docs_insert on public.ggym_docs;
drop policy if exists ggym_docs_update on public.ggym_docs;

create policy ggym_docs_select on public.ggym_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ggym_docs_insert on public.ggym_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ggym_docs_update on public.ggym_docs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Không có policy DELETE: app không bao giờ xoá dòng dữ liệu trên server.

create or replace function public.ggym_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ggym_docs_touch on public.ggym_docs;
create trigger ggym_docs_touch before update on public.ggym_docs
  for each row execute function public.ggym_touch();

-- ---------------------------------------------------------------------
-- Views phân tích (security_invoker: người dùng app chỉ thấy dữ liệu của mình;
-- kết nối bằng user postgres trong Power BI sẽ thấy tất cả tài khoản).
-- Thời gian quy đổi sang giờ Việt Nam.
-- ---------------------------------------------------------------------
create or replace view public.ggym_workouts with (security_invoker = on) as
select
  d.user_id,
  w ->> 'id'   as workout_id,
  w ->> 'name' as workout_name,
  (to_timestamp((w ->> 'start')::double precision / 1000) at time zone 'Asia/Ho_Chi_Minh') as started_at,
  (to_timestamp((w ->> 'end')::double precision / 1000)   at time zone 'Asia/Ho_Chi_Minh') as ended_at,
  round((((w ->> 'end')::numeric - (w ->> 'start')::numeric) / 60000), 1)                  as duration_min,
  jsonb_array_length(coalesce(w -> 'prs', '[]'::jsonb))                                    as pr_count
from public.ggym_docs d
cross join lateral jsonb_array_elements(coalesce(d.doc -> 'workouts', '[]'::jsonb)) as w;

create or replace view public.ggym_sets with (security_invoker = on) as
select
  d.user_id,
  w ->> 'id' as workout_id,
  (to_timestamp((w ->> 'start')::double precision / 1000) at time zone 'Asia/Ho_Chi_Minh') as started_at,
  e.ord      as exercise_order,
  e.x ->> 'exId' as exercise_id,
  coalesce(ex.x ->> 'name', e.x ->> 'exId') as exercise_name,
  ex.x ->> 'group' as muscle_group,
  s.ord      as set_order,
  coalesce(s.x ->> 't', 'n') = 'w' as is_warmup,
  (s.x ->> 'w')::numeric as weight_kg,
  (s.x ->> 'r')::integer as reps,
  (s.x ->> 'w')::numeric * (s.x ->> 'r')::integer as volume_kg,
  case when (s.x ->> 'r')::integer = 1 then (s.x ->> 'w')::numeric
       else round((s.x ->> 'w')::numeric * (1 + (s.x ->> 'r')::numeric / 30), 1) end as est_1rm_kg
from public.ggym_docs d
cross join lateral jsonb_array_elements(coalesce(d.doc -> 'workouts', '[]'::jsonb)) as w
cross join lateral jsonb_array_elements(coalesce(w -> 'exercises', '[]'::jsonb)) with ordinality as e(x, ord)
cross join lateral jsonb_array_elements(coalesce(e.x -> 'sets', '[]'::jsonb)) with ordinality as s(x, ord)
left join lateral (
  select xe as x from jsonb_array_elements(coalesce(d.doc -> 'exercises', '[]'::jsonb)) as xe
  where xe ->> 'id' = e.x ->> 'exId' limit 1
) as ex on true;

create or replace view public.ggym_body with (security_invoker = on) as
select
  d.user_id,
  b ->> 'id' as entry_id,
  (to_timestamp((b ->> 'd')::double precision / 1000) at time zone 'Asia/Ho_Chi_Minh')::date as measured_on,
  (b ->> 'kg')::numeric as weight_kg,
  nullif((b ->> 'bf')::numeric, 0) as body_fat_pct
from public.ggym_docs d
cross join lateral jsonb_array_elements(coalesce(d.doc -> 'body', '[]'::jsonb)) as b;
