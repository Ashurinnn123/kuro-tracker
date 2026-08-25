-- 0005: light novels track volumes alongside chapters.
alter table public.titles
  add column if not exists total_volumes int,
  add column if not exists current_volume int not null default 0;
