-- 0011: AniList-style content tags per title (complement to genres).
alter table public.titles
  add column if not exists tags text[] not null default '{}';
