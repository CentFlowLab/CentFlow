-- Configuração remota da app (versão mínima, manutenção, URLs das lojas).
-- Leitura pública; escrita apenas via service role / dashboard.

CREATE TABLE IF NOT EXISTS public.app_config (
  id text PRIMARY KEY DEFAULT 'global',
  minimum_supported_version text NOT NULL DEFAULT '1.0.0',
  latest_version text NOT NULL DEFAULT '1.0.0',
  force_update_required boolean NOT NULL DEFAULT false,
  maintenance_mode boolean NOT NULL DEFAULT false,
  update_message text,
  store_url_ios text,
  store_url_android text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_public_read" ON public.app_config;
CREATE POLICY "app_config_public_read"
  ON public.app_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.app_config (id)
VALUES ('global')
ON CONFLICT (id) DO NOTHING;
