-- 0008: favorite quote per title (notes column already exists).
alter table public.titles
  add column if not exists favorite_quote text;
