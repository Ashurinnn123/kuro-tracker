-- 0010: drop favorite_quote (feature removed).
alter table public.titles
  drop column if exists favorite_quote;
