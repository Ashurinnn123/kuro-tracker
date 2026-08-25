-- 0006_genres.sql — store AniList genres per title (auto-filled, not manual)
alter table public.titles
  add column if not exists genres text[] not null default '{}';
