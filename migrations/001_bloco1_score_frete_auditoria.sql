-- ==============================================================================
-- Migração 001 — SOUFII
-- Rode isso no Supabase Dashboard > SQL Editor > New query > Run.
-- O client Python (supabase-py) usa a REST API e não pode executar DDL,
-- por isso essas colunas precisam ser criadas manualmente aqui.
-- Todas as colunas são NULLable / têm default seguro — não quebra nada existente.
-- ==============================================================================

-- Bloco 1.5 — Score ponderado ZARC/EMBRAPA (critérios graduados, não binários)
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS score_ponderado INTEGER;

-- Bloco 1.1 — Geocodificação validada por bounding box de UF
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS geocodificacao_validada BOOLEAN;

-- Bloco 1.3 — Validação de série temporal NASA POWER
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS n_meses_validos INTEGER;
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS serie_incompleta BOOLEAN;
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS risco_geada_auditoria TEXT;

-- Bloco 1.4 — Validação cruzada de altitude/coordenada com IBGE
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS coordenada_divergente BOOLEAN;
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS fonte_altitude TEXT;

-- Bloco 3.4 — Logística e frete até as 3 maltarias de referência
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS dist_guarapuava_km FLOAT;
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS dist_lages_km FLOAT;
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS dist_ponta_grossa_km FLOAT;
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS frete_estimado_sc FLOAT;
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS maltaria_referencia TEXT;
ALTER TABLE municipios_aptidao ADD COLUMN IF NOT EXISTS zona_logistica TEXT;

-- Índice para ordenar/filtrar rapidamente pelo novo score no mapa e no ranking
CREATE INDEX IF NOT EXISTS idx_municipios_score_ponderado
    ON municipios_aptidao (score_ponderado DESC);

CREATE INDEX IF NOT EXISTS idx_municipios_zona_logistica
    ON municipios_aptidao (zona_logistica);
