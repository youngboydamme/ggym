-- =====================================================================
-- GGym — Supabase schema
-- Chạy 1 lần trong Supabase → SQL Editor. Chạy lại cũng an toàn (idempotent),
-- KHÔNG xoá hay ghi đè dữ liệu đã có.
--
-- Thiết kế: app offline-first. Từ bản này dữ liệu nằm trong ggym_items:
-- mỗi buổi tập / lần đo / routine / bài tập / mục đã xoá là 1 dòng, nên mỗi lần
-- đồng bộ app chỉ gửi và tải những dòng thay đổi, không gửi lại toàn bộ.
-- ggym_docs (1 dòng jsonb / tài khoản) là cách lưu cũ: giữ lại để app tự chuyển
-- dữ liệu cũ sang và để máy chưa cập nhật app vẫn gửi được; không xoá.
-- Các view ggym_workouts / ggym_sets / ggym_body bung dữ liệu ra bảng phẳng
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
-- ggym_items: mỗi mục 1 dòng
--   kind = workouts | body | exercises | routines : data = nguyên mục (jsonb)
--   kind = del  : mục có id này đã bị xoá (u = lúc xoá), data = null
--   kind = meta : id = 'doc', data = cài đặt, thời gian nghỉ, buổi đang tập
--   u          = thời điểm sửa trên máy (ms); bản có u lớn hơn thắng
--   updated_at = giờ server, app dùng làm mốc để chỉ tải dòng mới
-- ---------------------------------------------------------------------
create table if not exists public.ggym_items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('workouts', 'body', 'exercises', 'routines', 'del', 'meta')),
  id         text        not null,
  data       jsonb,
  u          bigint      not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists ggym_items_user_updated on public.ggym_items (user_id, updated_at);

alter table public.ggym_items enable row level security;

drop policy if exists ggym_items_select on public.ggym_items;
drop policy if exists ggym_items_insert on public.ggym_items;
drop policy if exists ggym_items_update on public.ggym_items;

create policy ggym_items_select on public.ggym_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ggym_items_insert on public.ggym_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ggym_items_update on public.ggym_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Không có policy DELETE, như ggym_docs.

-- Ghi đè chỉ khi bản gửi lên mới hơn (u lớn hơn hoặc bằng): hai máy gửi cùng lúc
-- thì bản sửa sau thắng, bản cũ bị bỏ qua thay vì đè lên.
create or replace function public.ggym_items_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.u < old.u then
    return null;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ggym_items_write on public.ggym_items;
create trigger ggym_items_write before insert or update on public.ggym_items
  for each row execute function public.ggym_items_write();

-- Chuyển dữ liệu cũ từ ggym_docs sang ggym_items. Chạy lại không sao:
-- dòng đã có trong ggym_items được giữ nguyên (on conflict do nothing).
insert into public.ggym_items (user_id, kind, id, data, u)
select d.user_id, k.kind, x ->> 'id', x, coalesce((x ->> 'u')::numeric, 0)::bigint
from public.ggym_docs d
cross join (values ('workouts'), ('body'), ('exercises'), ('routines')) as k(kind)
cross join lateral jsonb_array_elements(coalesce(d.doc -> k.kind, '[]'::jsonb)) as x
where x ->> 'id' is not null
on conflict (user_id, kind, id) do nothing;

insert into public.ggym_items (user_id, kind, id, data, u)
select d.user_id, 'del', t.key, null, coalesce((t.value #>> '{}')::numeric, 0)::bigint
from public.ggym_docs d
cross join lateral jsonb_each(coalesce(d.doc -> 'del', '{}'::jsonb)) as t
on conflict (user_id, kind, id) do nothing;

insert into public.ggym_items (user_id, kind, id, data, u)
select d.user_id, 'meta', 'doc',
       jsonb_build_object('settings', d.doc -> 'settings', 'restBy', d.doc -> 'restBy',
                          'active', d.doc -> 'active', 'mt', d.doc -> 'mt'),
       coalesce((d.doc ->> 'mt')::numeric, 0)::bigint
from public.ggym_docs d
on conflict (user_id, kind, id) do nothing;

-- ---------------------------------------------------------------------
-- Views phân tích (security_invoker: người dùng app chỉ thấy dữ liệu của mình;
-- kết nối bằng user postgres trong Power BI sẽ thấy tất cả tài khoản).
-- Thời gian quy đổi sang giờ Việt Nam.
-- ---------------------------------------------------------------------
-- các mục còn hiệu lực: có dữ liệu và chưa bị xoá
create or replace view public.ggym_live with (security_invoker = on) as
select i.user_id, i.kind, i.id, i.data
from public.ggym_items i
where i.data is not null
  and i.kind in ('workouts', 'body', 'exercises', 'routines')
  and not exists (
    select 1 from public.ggym_items x
    where x.user_id = i.user_id and x.kind = 'del' and x.id = i.id
  );

create or replace view public.ggym_workouts with (security_invoker = on) as
select
  d.user_id,
  w ->> 'id'   as workout_id,
  w ->> 'name' as workout_name,
  (to_timestamp((w ->> 'start')::double precision / 1000) at time zone 'Asia/Ho_Chi_Minh') as started_at,
  (to_timestamp((w ->> 'end')::double precision / 1000)   at time zone 'Asia/Ho_Chi_Minh') as ended_at,
  round((((w ->> 'end')::numeric - (w ->> 'start')::numeric) / 60000), 1)                  as duration_min,
  jsonb_array_length(coalesce(w -> 'prs', '[]'::jsonb))                                    as pr_count
from public.ggym_live d
cross join lateral (select d.data) as wk(w)
where d.kind = 'workouts';

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
       else round((s.x ->> 'w')::numeric * (1 + (s.x ->> 'r')::numeric / 30), 1) end as est_1rm_kg,
  -- bài thời gian / quãng đường (Plank, Treadmill…): tm = giây, km = quãng đường
  (s.x ->> 'tm')::integer as duration_sec,
  (s.x ->> 'km')::numeric as distance_km
from public.ggym_live d
cross join lateral (select d.data) as wk(w)
cross join lateral jsonb_array_elements(coalesce(w -> 'exercises', '[]'::jsonb)) with ordinality as e(x, ord)
cross join lateral jsonb_array_elements(coalesce(e.x -> 'sets', '[]'::jsonb)) with ordinality as s(x, ord)
left join lateral (
  select xe.data as x from public.ggym_live xe
  where xe.user_id = d.user_id and xe.kind = 'exercises' and xe.id = e.x ->> 'exId' limit 1
) as ex on true
where d.kind = 'workouts';

create or replace view public.ggym_body with (security_invoker = on) as
select
  d.user_id,
  b ->> 'id' as entry_id,
  (to_timestamp((b ->> 'd')::double precision / 1000) at time zone 'Asia/Ho_Chi_Minh')::date as measured_on,
  (b ->> 'kg')::numeric as weight_kg,
  nullif((b ->> 'bf')::numeric, 0) as body_fat_pct,
  nullif((b ->> 'smm')::numeric, 0) as skeletal_muscle_kg,
  nullif((b ->> 'fm')::numeric, 0) as body_fat_mass_kg,
  nullif((b ->> 'vf')::numeric, 0) as visceral_fat_level,
  nullif((b ->> 'tbw')::numeric, 0) as total_body_water_kg,
  nullif((b ->> 'bmr')::numeric, 0) as bmr_kcal,
  nullif((b ->> 'sc')::numeric, 0) as inbody_score,
  nullif((b ->> 'prot')::numeric, 0) as protein_kg,
  nullif((b ->> 'mnr')::numeric, 0) as minerals_kg,
  nullif((b ->> 'ffm')::numeric, 0) as fat_free_mass_kg,
  nullif((b ->> 'bmi')::numeric, 0) as bmi,
  nullif((b ->> 'whr')::numeric, 0) as waist_hip_ratio,
  nullif((b ->> 'ln_la')::numeric, 0) as lean_left_arm_kg,
  nullif((b ->> 'ln_la_p')::numeric, 0) as lean_left_arm_pct,
  nullif((b ->> 'ln_ra')::numeric, 0) as lean_right_arm_kg,
  nullif((b ->> 'ln_ra_p')::numeric, 0) as lean_right_arm_pct,
  nullif((b ->> 'ln_tr')::numeric, 0) as lean_trunk_kg,
  nullif((b ->> 'ln_tr_p')::numeric, 0) as lean_trunk_pct,
  nullif((b ->> 'ln_ll')::numeric, 0) as lean_left_leg_kg,
  nullif((b ->> 'ln_ll_p')::numeric, 0) as lean_left_leg_pct,
  nullif((b ->> 'ln_rl')::numeric, 0) as lean_right_leg_kg,
  nullif((b ->> 'ln_rl_p')::numeric, 0) as lean_right_leg_pct,
  nullif((b ->> 'ft_la')::numeric, 0) as fat_left_arm_kg,
  nullif((b ->> 'ft_la_p')::numeric, 0) as fat_left_arm_pct,
  nullif((b ->> 'ft_ra')::numeric, 0) as fat_right_arm_kg,
  nullif((b ->> 'ft_ra_p')::numeric, 0) as fat_right_arm_pct,
  nullif((b ->> 'ft_tr')::numeric, 0) as fat_trunk_kg,
  nullif((b ->> 'ft_tr_p')::numeric, 0) as fat_trunk_pct,
  nullif((b ->> 'ft_ll')::numeric, 0) as fat_left_leg_kg,
  nullif((b ->> 'ft_ll_p')::numeric, 0) as fat_left_leg_pct,
  nullif((b ->> 'ft_rl')::numeric, 0) as fat_right_leg_kg,
  nullif((b ->> 'ft_rl_p')::numeric, 0) as fat_right_leg_pct,
  nullif((b ->> 'c_waist')::numeric, 0) as waist_cm,
  nullif((b ->> 'c_hip')::numeric, 0) as hip_cm,
  nullif((b ->> 'c_chest')::numeric, 0) as chest_cm,
  nullif((b ->> 'c_shld')::numeric, 0) as shoulders_cm,
  nullif((b ->> 'c_thigh')::numeric, 0) as thigh_cm,
  nullif((b ->> 'c_arm')::numeric, 0) as upper_arm_cm,
  nullif((b ->> 'c_thigh_l')::numeric, 0) as thigh_left_cm,
  nullif((b ->> 'c_thigh_r')::numeric, 0) as thigh_right_cm,
  nullif((b ->> 'c_arm_l')::numeric, 0) as upper_arm_left_cm,
  nullif((b ->> 'c_arm_r')::numeric, 0) as upper_arm_right_cm
from public.ggym_live d
cross join lateral (select d.data) as bb(b)
where d.kind = 'body';
