-- 偶然の6人: 催行人数・氏名・締切優先表示の追加ルール
-- 202607140001_initial_schema.sql 適用済みのDBに、そのまま実行できます。

begin;

-- 最低催行人数は主催者を含めて3人に固定する。
-- 旧データに2人定員や別の最低人数があっても、安全に新ルールへ揃える。
update public.events set capacity = 3 where capacity < 3;
update public.events set min_participants = 3 where min_participants <> 3;

alter table public.events drop constraint if exists events_capacity_check;
alter table public.events drop constraint if exists events_min_participants_check;
alter table public.events alter column min_participants set default 3;
alter table public.events
  add constraint events_capacity_check check (capacity between 3 and 6),
  add constraint events_min_participants_check check (min_participants = 3 and min_participants <= capacity);

comment on column public.events.min_participants is '主催者を含む最低催行人数。3人固定。';

-- 苗字と名前はDBでも別カラムに保持する。Auth直後の未登録プロフィールだけはnullを許可する。
alter table public.profiles
  add column if not exists last_name text,
  add column if not exists first_name text;

update public.profiles
set
  last_name = split_part(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'), ' ', 1),
  first_name = substr(
    regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'),
    strpos(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'), ' ') + 1
  )
where last_name is null
  and first_name is null
  and name is not null
  and strpos(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'), ' ') > 0
  and char_length(split_part(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'), ' ', 1)) between 1 and 50
  and char_length(substr(
    regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'),
    strpos(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g'), ' ') + 1
  )) between 1 and 50;

alter table public.profiles drop constraint if exists profiles_name_parts_check;
alter table public.profiles
  add constraint profiles_name_parts_check check (
    (last_name is null and first_name is null)
    or (
      last_name is not null and first_name is not null
      and char_length(trim(last_name)) between 1 and 50
      and char_length(trim(first_name)) between 1 and 50
    )
  );

comment on column public.profiles.last_name is '必須プロフィール登録で入力する苗字';
comment on column public.profiles.first_name is '必須プロフィール登録で入力する名前';

create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'name', p.name,
    'lastName', p.last_name,
    'firstName', p.first_name,
    'department', p.department,
    'role', p.role,
    'interestTags', to_jsonb(p.interest_tags),
    'profileComplete', coalesce(trim(p.last_name), '') <> '' and coalesce(trim(p.first_name), '') <> '',
    'createdAt', p.created_at
  )
  from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.update_my_profile(
  p_last_name text,
  p_first_name text,
  p_department text,
  p_interest_tags text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clean_last_name text;
  clean_first_name text;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;

  clean_last_name := regexp_replace(trim(coalesce(p_last_name, '')), '[[:space:]]+', ' ', 'g');
  clean_first_name := regexp_replace(trim(coalesce(p_first_name, '')), '[[:space:]]+', ' ', 'g');
  if char_length(clean_last_name) not between 1 and 50
    or char_length(clean_first_name) not between 1 and 50 then
    raise exception '苗字と名前をそれぞれ1〜50文字で入力してください';
  end if;

  update public.profiles
  set
    last_name = clean_last_name,
    first_name = clean_first_name,
    name = clean_last_name || ' ' || clean_first_name,
    department = nullif(trim(p_department), ''),
    interest_tags = coalesce(p_interest_tags, '{}')
  where id = auth.uid();

  return public.get_my_profile();
end;
$$;

-- 旧バージョンの画面からの更新も、移行中は受け付ける。
create or replace function public.update_my_profile(p_name text, p_department text, p_interest_tags text[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clean_name text;
  separator_position integer;
begin
  clean_name := regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
  separator_position := strpos(clean_name, ' ');
  if separator_position <= 1 or separator_position >= char_length(clean_name) then
    raise exception '苗字と名前を両方入力してください';
  end if;

  return public.update_my_profile(
    left(clean_name, separator_position - 1),
    substr(clean_name, separator_position + 1),
    p_department,
    p_interest_tags
  );
end;
$$;

-- 3人に達した時点で開催確定。締切前かつ空席があれば、その後も応募できる。
create or replace function public.effective_event_status(p_event_id bigint)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when e.status = '未実施' then '未実施'
    when now() >= e.datetime + make_interval(mins => e.duration_minutes)
      then case when 1 + count(p.id) filter (where p.status = '申込') >= e.min_participants
        then '開催済' else '未実施' end
    when e.status = '実施確定' then '実施確定'
    when 1 + count(p.id) filter (where p.status = '申込') >= e.min_participants then '実施確定'
    when now() >= public.deadline_at(e.deadline) then '未実施'
    else '募集中'
  end
  from public.events e
  left join public.participations p on p.event_id = e.id
  where e.id = p_event_id
  group by e.id;
$$;

-- 締切まで3日以内で、まだ応募可能なイベントを「締切間近」とする。
create or replace function public.event_deadline_is_soon(p_event_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select public.effective_event_status(e.id) in ('募集中', '実施確定')
      and now() < public.deadline_at(e.deadline)
      and public.deadline_at(e.deadline) <= now() + interval '3 days'
    from public.events e
    where e.id = p_event_id
  ), false);
$$;

create or replace function public.event_json(p_event_id bigint, p_user_id uuid default auth.uid())
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', e.id,
    'theme', e.theme,
    'subTheme', e.sub_theme,
    'datetime', e.datetime,
    'durationMinutes', e.duration_minutes,
    'location', e.location,
    'locationUrl', e.location_url,
    'fee', e.fee,
    'capacity', e.capacity,
    'minParticipants', e.min_participants,
    'deadline', e.deadline,
    'notes', e.notes,
    'tags', coalesce((
      select jsonb_agg(t.name order by t.name)
      from public.event_tags et join public.tags t on t.id = et.tag_id
      where et.event_id = e.id
    ), '[]'::jsonb),
    'hostId', e.host_id,
    'hostName', hp.name,
    'hostDepartment', hp.department,
    'participantsCount', 1 + (select count(*) from public.participations p where p.event_id = e.id and p.status = '申込'),
    'remainingSeats', greatest(0, e.capacity - 1 - (select count(*) from public.participations p where p.event_id = e.id and p.status = '申込')),
    'status', public.effective_event_status(e.id),
    'isDeadlineSoon', public.event_deadline_is_soon(e.id),
    'isApplied', exists(select 1 from public.participations p where p.event_id = e.id and p.user_id = p_user_id and p.status = '申込'),
    'isHost', e.host_id = p_user_id,
    'createdAt', e.created_at
  )
  from public.events e
  join public.profiles hp on hp.id = e.host_id
  where e.id = p_event_id;
$$;

-- 通常の一覧では締切間近を最上位にし、その中では締切が早い順にする。
create or replace function public.list_events(p_status text default null, p_tag text default null, p_sort_by text default 'new')
returns setof jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.event_json(e.id, auth.uid())
  from public.events e
  where (p_status is null or public.effective_event_status(e.id) = p_status)
    and (p_tag is null or exists (
      select 1
      from public.event_tags et
      join public.tags t on t.id = et.tag_id
      where et.event_id = e.id and lower(t.name) = lower(p_tag)
    ))
  order by
    case when coalesce(p_sort_by, 'new') = 'new' and public.event_deadline_is_soon(e.id) then 0
         when coalesce(p_sort_by, 'new') = 'new' then 1 end asc,
    case when coalesce(p_sort_by, 'new') = 'new' and public.event_deadline_is_soon(e.id)
      then public.deadline_at(e.deadline) end asc,
    case when p_sort_by = 'near' then e.datetime end asc,
    case when p_sort_by = 'seats' then e.capacity - 1 - (
      select count(*) from public.participations p
      where p.event_id = e.id and p.status = '申込'
    ) end asc,
    case when coalesce(p_sort_by, 'new') = 'new' then e.created_at end desc;
$$;

create or replace function public.create_event(
  p_theme text, p_sub_theme text, p_datetime timestamptz, p_duration_minutes integer,
  p_location text, p_location_url text, p_fee integer, p_capacity integer,
  p_min_participants integer, p_deadline date, p_notes text, p_tags text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare new_id bigint;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  if trim(coalesce(p_theme, '')) = '' then raise exception 'テーマは必須です'; end if;
  if trim(coalesce(p_location, '')) = '' then raise exception '場所は必須です'; end if;
  if p_datetime is null then raise exception '開催日時は必須です'; end if;
  if p_duration_minutes not between 1 and 120 then raise exception '開催時間は2時間以内です'; end if;
  if p_fee not between 0 and 5000 then raise exception '会費は5,000円以内です'; end if;
  if p_capacity not between 3 and 6 then raise exception '定員は3〜6人です'; end if;
  if p_min_participants <> 3 then raise exception '最低催行人数は3人固定です'; end if;
  if p_deadline is null then raise exception '申込締切日は必須です'; end if;
  if p_deadline > (p_datetime at time zone 'Asia/Tokyo')::date then raise exception '申込締切日は開催日以前にしてください'; end if;

  insert into public.events (
    host_id, theme, sub_theme, datetime, duration_minutes, location, location_url,
    fee, capacity, min_participants, deadline, notes
  ) values (
    auth.uid(), trim(p_theme), nullif(trim(p_sub_theme), ''), p_datetime, p_duration_minutes,
    trim(p_location), nullif(trim(p_location_url), ''), p_fee, p_capacity,
    3, p_deadline, nullif(trim(p_notes), '')
  ) returning id into new_id;
  perform public.replace_event_tags(new_id, p_tags);
  return public.event_json(new_id, auth.uid());
end;
$$;

create or replace function public.update_event(
  p_event_id bigint, p_theme text, p_sub_theme text, p_datetime timestamptz,
  p_duration_minutes integer, p_location text, p_location_url text, p_fee integer,
  p_capacity integer, p_min_participants integer, p_deadline date, p_notes text, p_tags text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare existing public.events%rowtype;
declare active_count integer;
begin
  select * into existing from public.events where id = p_event_id for update;
  if not found then raise exception '会が見つかりません'; end if;
  if existing.host_id <> auth.uid() then raise exception '編集権限がありません'; end if;
  if trim(coalesce(p_theme, '')) = '' then raise exception 'テーマは必須です'; end if;
  if trim(coalesce(p_location, '')) = '' then raise exception '場所は必須です'; end if;
  if p_datetime is null then raise exception '開催日時は必須です'; end if;
  select count(*) into active_count from public.participations where event_id = p_event_id and status = '申込';
  if p_capacity < active_count + 1 then raise exception '現在の参加人数より定員を減らせません'; end if;
  if p_duration_minutes not between 1 and 120 then raise exception '開催時間は2時間以内です'; end if;
  if p_fee not between 0 and 5000 then raise exception '会費は5,000円以内です'; end if;
  if p_capacity not between 3 and 6 then raise exception '定員は3〜6人です'; end if;
  if p_min_participants <> 3 then raise exception '最低催行人数は3人固定です'; end if;
  if p_deadline is null then raise exception '申込締切日は必須です'; end if;
  if p_deadline > (p_datetime at time zone 'Asia/Tokyo')::date then raise exception '申込締切日は開催日以前にしてください'; end if;

  update public.events set
    theme = trim(p_theme), sub_theme = nullif(trim(p_sub_theme), ''), datetime = p_datetime,
    duration_minutes = p_duration_minutes, location = trim(p_location),
    location_url = nullif(trim(p_location_url), ''), fee = p_fee, capacity = p_capacity,
    min_participants = 3, deadline = p_deadline, notes = nullif(trim(p_notes), '')
  where id = p_event_id;
  perform public.replace_event_tags(p_event_id, p_tags);
  return public.event_json(p_event_id, auth.uid());
end;
$$;

create or replace function public.apply_to_event(p_event_id bigint, p_comment text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare event_row public.events%rowtype;
declare active_count integer;
declare participation_row public.participations%rowtype;
declare applicant_name text;
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  select * into event_row from public.events where id = p_event_id for update;
  if not found then raise exception '会が見つかりません'; end if;
  if event_row.host_id = auth.uid() then raise exception 'ホストは自分の会に申し込めません'; end if;
  if public.effective_event_status(p_event_id) not in ('募集中', '実施確定') then raise exception 'この会は募集を終了しています'; end if;
  if now() >= public.deadline_at(event_row.deadline) then raise exception '申込締切を過ぎています'; end if;
  if now() >= event_row.datetime then raise exception 'イベントはすでに開始しています'; end if;

  select count(*) into active_count from public.participations where event_id = p_event_id and status = '申込';
  if active_count >= event_row.capacity - 1 then raise exception '定員に達しています'; end if;

  insert into public.participations(event_id, user_id, comment, status, applied_at, cancelled_at)
  values (p_event_id, auth.uid(), nullif(trim(p_comment), ''), '申込', now(), null)
  on conflict (event_id, user_id) do update
    set comment = excluded.comment, status = '申込', applied_at = now(), cancelled_at = null
  returning * into participation_row;

  select coalesce(name, email, '参加者') into applicant_name from public.profiles where id = auth.uid();
  insert into public.notifications(user_id, type, content)
  values (event_row.host_id, 'apply', applicant_name || 'さんが「' || event_row.theme || '」に申し込みました');

  return jsonb_build_object(
    'id', participation_row.id, 'eventId', participation_row.event_id,
    'status', participation_row.status, 'comment', participation_row.comment,
    'appliedAt', participation_row.applied_at
  );
end;
$$;

revoke execute on function public.event_deadline_is_soon(bigint) from public, anon, authenticated;
grant execute on function public.update_my_profile(text, text, text, text[]) to authenticated;
grant execute on function public.update_my_profile(text, text, text[]) to authenticated;
grant execute on function public.list_events(text, text, text) to authenticated;

commit;
