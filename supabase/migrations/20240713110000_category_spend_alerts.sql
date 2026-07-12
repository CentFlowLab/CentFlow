-- Alertas de gasto acima da mediana por categoria

alter table public.user_preferences
  add column if not exists category_spend_alerts boolean not null default true,
  add column if not exists category_spend_alert_threshold numeric(3, 1) not null default 2.0
    check (category_spend_alert_threshold >= 1.5 and category_spend_alert_threshold <= 3.0);

comment on column public.user_preferences.category_spend_alerts is
  'Notificar quando um gasto ultrapassa a mediana histórica da categoria';

comment on column public.user_preferences.category_spend_alert_threshold is
  'Multiplicador sobre a mediana da categoria (1.5 a 3.0)';
