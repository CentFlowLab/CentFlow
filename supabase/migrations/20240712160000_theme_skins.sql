-- Expandir skins disponíveis (Classic + 3 novos temas)

alter table public.user_preferences
  drop constraint if exists user_preferences_theme_id_check;

update public.user_preferences
set theme_id = 'classic'
where theme_id in ('dark-premium', 'dark-classic');

alter table public.user_preferences
  alter column theme_id set default 'classic';

alter table public.user_preferences
  add constraint user_preferences_theme_id_check
  check (
    theme_id in (
      'classic',
      'midnight-indigo',
      'warm-graphite',
      'deep-emerald',
      'dark-premium',
      'dark-classic'
    )
  );

comment on column public.user_preferences.theme_id is
  'Skin visual da app: classic, midnight-indigo, warm-graphite, deep-emerald';
