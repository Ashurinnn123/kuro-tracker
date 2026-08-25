-- 0004: avatars bucket + per-user RLS.
-- Public read so <img> can render without signed URLs; writes scoped to owner
-- via folder name = auth.uid().
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Avatar owner insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Avatar owner update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Avatar owner delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.role() = 'authenticated'
         and (storage.foldername(name))[1] = auth.uid()::text);
