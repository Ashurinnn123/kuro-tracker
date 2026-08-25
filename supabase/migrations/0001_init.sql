-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Enums
create type media_type_enum as enum('manga', 'manhwa', 'light_novel');
create type reading_status_enum as enum('want_to_read', 'reading', 'completed', 'on_hold', 'dropped');

-- Create Titles table
create table public.titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  media_type media_type_enum not null,
  cover_url text,
  total_chapters int,
  current_chapter int not null default 0,
  status reading_status_enum not null default 'want_to_read',
  rating int check (rating between 1 and 5),
  notes text,
  is_favorite boolean not null default false,
  started_at date,
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.titles enable row level security;

-- Create Policies
create policy "Users can view their own titles" 
  on public.titles for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own titles" 
  on public.titles for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own titles" 
  on public.titles for update 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own titles" 
  on public.titles for delete 
  using (auth.uid() = user_id);

-- Create Indexes
create index titles_user_id_idx on public.titles(user_id);
create index titles_user_id_status_idx on public.titles(user_id, status);
create index titles_user_id_updated_at_idx on public.titles(user_id, updated_at desc);

-- Function and trigger for updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_set_updated_at
before update on public.titles
for each row execute function set_updated_at();
