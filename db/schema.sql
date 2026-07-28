-- Supabase / Postgres migration for story app

-- 1) profiles (linked to auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique,
  display_name text,
  bio text,
  total_score integer not null default 0 check (total_score >= 0),
  streak integer not null default 0,
  last_contribution_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function profiles_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_profiles_updated_at on profiles;
create trigger trigger_profiles_updated_at
  before update on profiles
  for each row execute function profiles_updated_at();

-- 2) contributions
create table if not exists contributions (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  content text not null check (char_length(content) <= 100),
  is_official boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3) votes
create table if not exists votes (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  contribution_id bigint references contributions(id) on delete cascade,
  value integer not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  unique(user_id, contribution_id)
);

-- Indexes for fast leaderboard and realtime subscriptions
create index if not exists idx_profiles_total_score on profiles (total_score desc);
create index if not exists idx_contributions_created_at on contributions (created_at);

-- 4) RPC function to handle votes atomically
create or replace function process_vote(
  p_voter uuid,
  p_contribution_id bigint,
  p_new_vote integer
) returns jsonb language plpgsql as $$
declare
  v_owner uuid;
  v_existing integer := 0;
  v_current_total integer;
  v_delta integer;
begin
  if p_new_vote not in (-1,0,1) then
    raise exception 'Invalid vote value';
  end if;

  select user_id into v_owner from contributions where id = p_contribution_id;
  if not found then
    raise exception 'Contribution not found';
  end if;

  select value into v_existing from votes
    where user_id = p_voter and contribution_id = p_contribution_id
    for update;

  v_delta := (coalesce(p_new_vote,0) - coalesce(v_existing,0));

  select total_score into v_current_total from profiles where id = v_owner for update;

  if v_current_total + v_delta < 0 then
    raise exception 'This vote would lower the owner''s total below 0; action not allowed';
  end if;

  if v_existing is null then
    if p_new_vote = 0 then
      -- nothing
    else
      insert into votes(user_id, contribution_id, value) values (p_voter, p_contribution_id, p_new_vote);
    end if;
  else
    if p_new_vote = 0 then
      delete from votes where user_id = p_voter and contribution_id = p_contribution_id;
    else
      update votes set value = p_new_vote, created_at = now() where user_id = p_voter and contribution_id = p_contribution_id;
    end if;
  end if;

  update profiles set total_score = total_score + v_delta where id = v_owner;

  return jsonb_build_object(
    'owner_id', v_owner,
    'delta', v_delta,
    'new_owner_total', (select total_score from profiles where id = v_owner),
    'contribution_id', p_contribution_id
  );
end;
$$;
