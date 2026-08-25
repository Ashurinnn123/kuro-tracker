-- Rating scale: 1-5 int → 1-10 with one decimal (MyAnimeList style)
alter table public.titles drop constraint titles_rating_check;
alter table public.titles alter column rating type numeric(3,1);
alter table public.titles add constraint titles_rating_check check (rating between 1 and 10);
