-- Run once in Supabase SQL Editor. No secret keys are needed in the website.
begin;
create table if not exists public.likeable_games (
  game_id text primary key
);
create table if not exists public.game_likes (
  game_id text not null references public.likeable_games(game_id),
  visitor uuid not null,
  created_at timestamptz not null default now(),
  primary key (game_id, visitor)
);
alter table public.likeable_games enable row level security;
alter table public.game_likes enable row level security;
revoke all on public.likeable_games, public.game_likes from anon, authenticated;
insert into public.likeable_games(game_id) values
('/games/five-dice/'),('/games/stacked/'),('/games/slot-run/'),
('/games/childhood/'),('/games/candy-jump/'),('/games/hop-and-pop/'),
('/games/dust-outpost/'),('/games/mini-circuit/'),('/games/hand-guardian/'),
('/games/bubble-laundry/'),('/games/pull-radish/'),('/games/regicide-lite/'),
('/games/bie-mao-keng/'),('/games/childhood/sand-stick/'),
('/games/childhood/stone-catching/'),('/games/childhood/hopscotch/')
on conflict do nothing;
create or replace function public.get_game_likes()
returns table(game_id text, likes bigint)
language sql stable security definer set search_path = ''
as $$
  select g.game_id, count(l.visitor)
  from public.likeable_games g left join public.game_likes l on l.game_id=g.game_id
  group by g.game_id;
$$;
create or replace function public.set_game_like(p_game_id text, p_visitor uuid, p_liked boolean)
returns table(game_id text, likes bigint)
language plpgsql security definer set search_path = ''
as $$
begin
  if p_visitor is null or p_liked is null then
    raise exception 'Missing visitor or action';
  end if;
  perform 1 from public.likeable_games g where g.game_id=p_game_id for update;
  if not found then raise exception 'Unknown game'; end if;
  if p_liked then
    insert into public.game_likes(game_id,visitor) values(p_game_id,p_visitor)
      on conflict do nothing;
  else
    delete from public.game_likes l where l.game_id=p_game_id and l.visitor=p_visitor;
  end if;
  return query select p_game_id,count(*) from public.game_likes l where l.game_id=p_game_id;
end;
$$;
revoke all on function public.get_game_likes() from public;
revoke all on function public.set_game_like(text,uuid,boolean) from public;
grant execute on function public.get_game_likes() to anon,authenticated;
grant execute on function public.set_game_like(text,uuid,boolean) to anon,authenticated;
commit;
