-- level and xp are derived from lifetime_xp in the app; stop storing them.
alter table public.profiles
  drop column if exists level,
  drop column if exists xp;
