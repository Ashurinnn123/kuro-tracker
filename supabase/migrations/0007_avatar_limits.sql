-- 0007: harden avatars bucket — server-side MIME + size limits.
-- Client-side checks (settings page) are UX only; the bucket config is the
-- real trust boundary. App uploads only avatar.jpg / avatar.png per user.

-- Enforce allowed MIME types + max 2 MB on the bucket itself
update storage.buckets
set file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = array['image/png', 'image/jpeg']
where id = 'avatars';
