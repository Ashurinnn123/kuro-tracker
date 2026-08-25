-- 0009: public profile support.
-- username: unique handle for /u/<username> URLs.
-- is_library_public: opt-in share; library stays private by default.

alter table public.profiles
  add column if not exists username text unique,
  add column if not exists is_library_public boolean not null default false;

-- RLS addition: anyone (incl. anon) may view a profile row IF its owner
-- opted into a public library. Owner keeps full access via existing policies.
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (is_library_public = true);

-- Titles readable by everyone when owner opted in AND status shows on shelf.
-- Notes/quotes are NOT exposed — only shelf-level fields are selected client-side.
create policy "Public shelves are viewable by everyone"
  on public.titles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = titles.user_id
        and p.is_library_public = true
    )
    and status in ('reading', 'completed', 'on_hold')
  );
