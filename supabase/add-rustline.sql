-- Run in Supabase SQL Editor to enable real likes for this game.
insert into public.likeable_games (game_id)
values ('/games/rustline/')
on conflict do nothing;
