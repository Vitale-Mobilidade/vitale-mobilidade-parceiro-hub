-- =====================================================================
-- PROPOSTA — Etapa 6 (entidade Bike). NÃO É MIGRATION.
-- NÃO executar no banco vivo. Não mover para supabase/migrations/.
-- Somente para teste manual em ambiente isolado pelo responsável.
-- Aditiva: só CREATE; não altera tabelas, RPCs, writer, Quiz ou Radar.
-- Sem preço, link afiliado, elegibilidade ou PII nesta tabela.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.bikes (
  bike_id        text PRIMARY KEY
                 CHECK (bike_id ~* '^[a-z0-9][a-z0-9_-]{0,63}$'),  -- espelha BIKE_ID_RE (src/lib/bike-identity.ts)
  slug           text NOT NULL UNIQUE
                 CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           text NOT NULL CHECK (length(btrim(name)) > 0),
  -- Especificação permitida (fatos da planilha; nullable = não informado)
  autonomy_km    numeric CHECK (autonomy_km IS NULL OR autonomy_km > 0),
  max_speed_kmh  numeric CHECK (max_speed_kmh IS NULL OR max_speed_kmh > 0),
  motor_w        numeric CHECK (motor_w IS NULL OR motor_w > 0),
  battery        text,
  capacity       text,
  specs          jsonb NOT NULL DEFAULT '{}'::jsonb,  -- somente specs; proibido price/link/eligible
  source         text NOT NULL DEFAULT 'snapshot_backfill',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bikes_specs_no_commercial CHECK (
    NOT (specs ?| ARRAY['price','preco','linkVitale','link','url','eligible','status','sheetEligible'])
  )
);

-- bike_id imutável
CREATE OR REPLACE FUNCTION public.bikes_block_id_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.bike_id IS DISTINCT FROM OLD.bike_id THEN
    RAISE EXCEPTION 'bike_id is immutable';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bikes_immutable_id ON public.bikes;
CREATE TRIGGER bikes_immutable_id BEFORE UPDATE ON public.bikes
  FOR EACH ROW EXECUTE FUNCTION public.bikes_block_id_change();

-- Acesso: nenhum direto para anon/authenticated; só service_role.
REVOKE ALL ON public.bikes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.bikes TO service_role;
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
-- Sem policies: anon/authenticated negados. Leitura pública futura só via RPC revisada.

COMMIT;

-- =====================================================================
-- BACKFILL (separado, manual, após aprovação). Somente os 30 IDs do
-- snapshot 'current'. NÃO inclui jflsjdlksjdl nem v9_max_duas_baterias.
-- =====================================================================
-- INSERT INTO public.bikes (bike_id, slug, name, source)
-- SELECT b->>'id',
--        replace(b->>'id', '_', '-'),
--        b->>'name',
--        'snapshot_backfill'
-- FROM public.bike_catalog_snapshot s,
--      jsonb_array_elements(s.data->'bikes') b
-- WHERE s.id = 'current'
-- ON CONFLICT (bike_id) DO NOTHING;
-- Specs: preencher em passo separado após mapear as chaves reais do JSON.

-- =====================================================================
-- PARIDADE (leitura)
-- =====================================================================
-- 1) Conjunto idêntico ao snapshot (esperado: 0 linhas nas duas consultas)
-- SELECT b->>'id' FROM bike_catalog_snapshot s, jsonb_array_elements(s.data->'bikes') b
--  WHERE s.id='current' EXCEPT SELECT bike_id FROM bikes;
-- SELECT bike_id FROM bikes EXCEPT
--  SELECT b->>'id' FROM bike_catalog_snapshot s, jsonb_array_elements(s.data->'bikes') b WHERE s.id='current';
-- 2) Contagem esperada: 30.  SELECT count(*) FROM bikes;
-- 3) Slugs únicos e iguais ao derivado atual de /bikes (_ -> -).
-- 4) RPCs get_quiz_catalog / get_price_tracker_catalog / get_bike_price_history:
--    JSON antes == depois (hash md5 do ::text).

-- =====================================================================
-- ROLLBACK NÃO DESTRUTIVO
-- =====================================================================
-- Nada lê esta tabela; RPCs e writer atuais continuam fonte de verdade.
-- Para "desligar": não conectar leitores/writers (ou revertê-los por código).
-- Preservar tabela e dados para análise. DROP só em tarefa separada,
-- com backup e autorização explícita.
